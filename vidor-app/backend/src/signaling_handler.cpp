#include "signaling_handler.h"
#include "config.h"
#include "logger.h"
#include "jwt_utils.h"
#include "room_manager.h"
#include <drogon/drogon.h>
#include <algorithm>
#include <random>

namespace vidor {

SignalingHandler::SignalingHandler() 
    : start_time_(std::chrono::steady_clock::now()) {
    
    // Start cleanup timer
    std::thread([this]() {
        while (true) {
            std::this_thread::sleep_for(std::chrono::minutes(5));
            cleanup_stale_connections();
            cleanup_empty_rooms();
        }
    }).detach();
    
    LOG_INFO("SignalingHandler initialized");
}

SignalingHandler::~SignalingHandler() {
    // Close all connections
    std::lock_guard<std::shared_mutex> lock(mutex_);
    for (auto& [conn, _] : conn_to_participant_) {
        if (conn->connected()) {
            conn->send(json{{"type", "server-shutdown"}, {"message", "Server is shutting down"}}.dump());
            conn->disconnect();
        }
    }
}

void SignalingHandler::on_connection(const drogon::WebSocketConnectionPtr& conn) {
    std::lock_guard<std::shared_mutex> lock(mutex_);
    
    // Set connection context
    auto conn_id = std::to_string(reinterpret_cast<uintptr_t>(conn.get()));
    conn->setContext(std::make_shared<std::string>(conn_id));
    
    last_heartbeat_[conn] = std::chrono::steady_clock::now();
    
    LOG_INFO_CAT("websocket", "Connection established: " + conn_id);
}

void SignalingHandler::on_message(const drogon::WebSocketConnectionPtr& conn,
                                   const std::string& message) {
    ++messages_received_;
    
    try {
        json msg = json::parse(message);
        auto signaling_msg = SignalingMessage::from_json(msg);
        
        if (!signaling_msg) {
            LOG_WARN("Invalid signaling message received");
            conn->send(json{{"type", "error"}, {"message", "Invalid message format"}}.dump());
            ++errors_;
            return;
        }
        
        // Update heartbeat
        {
            std::lock_guard<std::shared_mutex> lock(mutex_);
            last_heartbeat_[conn] = std::chrono::steady_clock::now();
        }
        
        SignalingMessage& msg_data = *signaling_msg;
        
        switch (msg_data.type) {
            case MessageType::Join:
                handle_join(conn, msg_data);
                break;
                
            case MessageType::Leave:
                handle_leave(conn, msg_data);
                break;
                
            case MessageType::Offer:
                handle_offer(msg_data.room_id, msg_data.from_id, msg_data.to_id, msg_data.sdp);
                break;
                
            case MessageType::Answer:
                handle_answer(msg_data.room_id, msg_data.from_id, msg_data.to_id, msg_data.sdp);
                break;
                
            case MessageType::IceCandidate:
                handle_ice_candidate(msg_data.room_id, msg_data.from_id, msg_data.to_id, msg_data.sdp);
                break;
                
            case MessageType::Heartbeat:
                handle_heartbeat(conn);
                break;
                
            case MessageType::ParticipantUpdated:
                handle_participant_update(conn, msg_data);
                break;
                
            default:
                LOG_WARN("Unknown message type: " + SignalingMessage::message_type_to_string(msg_data.type));
                conn->send(json{{"type", "error"}, {"message", "Unknown message type"}}.dump());
                ++errors_;
        }
        
    } catch (const json::parse_error& e) {
        LOG_ERROR("JSON parse error: " + std::string(e.what()));
        conn->send(json{{"type", "error"}, {"message", "Invalid JSON"}}.dump());
        ++errors_;
    }
}

void SignalingHandler::on_close(const drogon::WebSocketConnectionPtr& conn) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto conn_it = conn_to_participant_.find(conn);
    if (conn_it != conn_to_participant_.end()) {
        std::string participant_id = conn_it->second;
        std::string room_id = conn_to_room_[conn];
        
        // Remove from room
        auto room_it = rooms_.find(room_id);
        if (room_it != rooms_.end()) {
            room_it->second->participants.erase(participant_id);
            
            // Notify others
            lock.unlock();
            broadcast_to_room(room_id, participant_id, {
                {"type", "participant-left"},
                {"participant_id", participant_id}
            });
            lock.lock();
            
            // Cleanup empty rooms
            if (room_it->second->participants.empty()) {
                rooms_.erase(room_it);
                LOG_INFO("Room deleted (empty): " + room_id);
            }
        }
        
        conn_to_participant_.erase(conn_it);
        conn_to_room_.erase(conn);
        last_heartbeat_.erase(conn);
        
        LOG_INFO_CAT("websocket", "Connection closed, participant left: " + participant_id);
    }
}

void SignalingHandler::handle_join(const drogon::WebSocketConnectionPtr& conn,
                                    const SignalingMessage& msg) {
    std::lock_guard<std::shared_mutex> lock(mutex_);
    
    if (msg.room_id.empty() || msg.participant_id.empty()) {
        conn->send(json{{"type", "error"}, {"message", "room_id and participant_id required"}}.dump());
        return;
    }
    
    auto room_it = rooms_.find(msg.room_id);
    if (room_it == rooms_.end()) {
        // Auto-create room if it doesn't exist
        auto room = std::make_shared<Room>();
        room->id = msg.room_id;
        room->code = msg.room_id;
        room->created_at = std::chrono::steady_clock::now();
        room->updated_at = room->created_at;
        rooms_[msg.room_id] = room;
        room_it = rooms_.find(msg.room_id);
        LOG_INFO("Auto-created room: " + msg.room_id);
    }
    
    auto room = room_it->second;
    
    // Check if room is full
    if (static_cast<int>(room->participants.size()) >= room->max_participants) {
        conn->send(json{{"type", "error"}, {"message", "Room is full"}}.dump());
        return;
    }
    
    // Check if room is locked
    if (room->is_locked) {
        conn->send(json{{"type", "error"}, {"message", "Room is locked"}}.dump());
        return;
    }
    
    // Create participant
    auto participant = std::make_shared<Participant>();
    participant->id = msg.participant_id;
    participant->name = msg.name.empty() ? "Participant" : msg.name;
    participant->connection = conn;
    participant->joined_at = std::chrono::steady_clock::now();
    
    room->participants[msg.participant_id] = participant;
    conn_to_participant_[conn] = msg.participant_id;
    conn_to_room_[conn] = msg.room_id;
    
    // Send success response with current participants
    json response = {
        {"type", "joined"},
        {"room_id", msg.room_id},
        {"participant_id", msg.participant_id},
        {"participants", json::array()}
    };
    
    for (const auto& [pid, p] : room->participants) {
        if (pid != msg.participant_id) {
            response["participants"].push_back({
                {"id", p->id},
                {"name", p->name},
                {"has_video", p->has_video},
                {"has_audio", p->has_audio}
            });
        }
    }
    
    conn->send(response.dump());
    
    // Notify others
    broadcast_to_room(msg.room_id, msg.participant_id, {
        {"type", "participant-joined"},
        {"participant_id", msg.participant_id},
        {"name", msg.name}
    });
    
    LOG_INFO("Participant joined room " + msg.room_id + ": " + msg.participant_id);
}

void SignalingHandler::handle_leave(const drogon::WebSocketConnectionPtr& conn,
                                     const SignalingMessage& msg) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    if (!msg.room_id.empty() && !msg.participant_id.empty()) {
        leave_room(msg.room_id, msg.participant_id);
        
        auto conn_it = conn_to_participant_.find(conn);
        if (conn_it != conn_to_participant_.end() && conn_it->second == msg.participant_id) {
            conn_to_participant_.erase(conn_it);
            conn_to_room_.erase(conn);
        }
    }
}

void SignalingHandler::handle_heartbeat(const drogon::WebSocketConnectionPtr& conn) {
    conn->send(json{{"type", "heartbeat-ack"}, {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count()}}.dump());
}

void SignalingHandler::handle_participant_update(const drogon::WebSocketConnectionPtr& conn,
                                                  const SignalingMessage& msg) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = conn_to_room_.find(conn);
    if (room_it == conn_to_room_.end()) {
        return;
    }
    
    auto room = rooms_[room_it->second];
    auto participant_it = room->participants.find(msg.participant_id);
    if (participant_it != room->participants.end()) {
        auto& p = participant_it->second;
        
        if (msg.data.contains("has_video")) {
            p->has_video = msg.data["has_video"].get<bool>();
        }
        if (msg.data.contains("has_audio")) {
            p->has_audio = msg.data["has_audio"].get<bool>();
        }
        if (msg.data.contains("is_screen_sharing")) {
            p->is_screen_sharing = msg.data["is_screen_sharing"].get<bool>();
        }
        
        broadcast_to_room(room_it->second, msg.participant_id, {
            {"type", "participant-updated"},
            {"participant_id", msg.participant_id},
            {"has_video", p->has_video},
            {"has_audio", p->has_audio},
            {"is_screen_sharing", p->is_screen_sharing}
        });
    }
}

std::string SignalingHandler::create_room(const std::string& creator_id, const json& settings) {
    std::lock_guard<std::shared_mutex> lock(mutex_);
    
    std::string room_id = std::to_string(++room_counter_);
    
    auto room = std::make_shared<Room>();
    room->id = room_id;
    room->code = generate_room_code();
    room->creator_id = creator_id;
    room->created_at = std::chrono::steady_clock::now();
    room->updated_at = room->created_at;
    room->settings = settings;
    
    if (settings.contains("max_participants")) {
        room->max_participants = settings["max_participants"].get<int>();
    }
    if (settings.contains("name")) {
        room->name = settings["name"].get<std::string>();
    }
    if (settings.contains("is_locked")) {
        room->is_locked = settings["is_locked"].get<bool>();
    }
    
    rooms_[room_id] = room;
    
    LOG_INFO("Room created: " + room_id + " (code: " + room->code + ")");
    
    return room_id;
}

bool SignalingHandler::join_room(const std::string& room_id,
                                  const std::string& participant_id,
                                  const std::string& name,
                                  const drogon::WebSocketConnectionPtr& conn) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = rooms_.find(room_id);
    if (room_it == rooms_.end()) {
        return false;
    }
    
    auto room = room_it->second;
    
    if (static_cast<int>(room->participants.size()) >= room->max_participants) {
        return false;
    }
    
    auto participant = std::make_shared<Participant>();
    participant->id = participant_id;
    participant->name = name.empty() ? "Participant" : name;
    participant->connection = conn;
    participant->joined_at = std::chrono::steady_clock::now();
    
    room->participants[participant_id] = participant;
    conn_to_participant_[conn] = participant_id;
    conn_to_room_[conn] = room_id;
    
    LOG_INFO("Participant " + participant_id + " joined room " + room_id);
    
    return true;
}

void SignalingHandler::leave_room(const std::string& room_id,
                                   const std::string& participant_id) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = rooms_.find(room_id);
    if (room_it != rooms_.end()) {
        room_it->second->participants.erase(participant_id);
        
        if (room_it->second->participants.empty()) {
            rooms_.erase(room_it);
        }
    }
    
    LOG_INFO("Participant " + participant_id + " left room " + room_id);
}

bool SignalingHandler::delete_room(const std::string& room_id) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto it = rooms_.find(room_id);
    if (it == rooms_.end()) {
        return false;
    }
    
    // Notify all participants
    for (auto& [pid, participant] : it->second->participants) {
        if (participant->connection && participant->connection->connected()) {
            participant->connection->send(json{
                {"type", "room-deleted"},
                {"reason", "Room was deleted by host"}
            }.dump());
            participant->connection->disconnect();
        }
    }
    
    rooms_.erase(it);
    LOG_INFO("Room deleted: " + room_id);
    
    return true;
}

void SignalingHandler::lock_room(const std::string& room_id) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto it = rooms_.find(room_id);
    if (it != rooms_.end()) {
        it->second->is_locked = true;
        
        broadcast_to_room(room_id, "", {
            {"type", "room-locked"}
        });
        
        LOG_INFO("Room locked: " + room_id);
    }
}

void SignalingHandler::unlock_room(const std::string& room_id) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto it = rooms_.find(room_id);
    if (it != rooms_.end()) {
        it->second->is_locked = false;
        
        broadcast_to_room(room_id, "", {
            {"type", "room-unlocked"}
        });
        
        LOG_INFO("Room unlocked: " + room_id);
    }
}

void SignalingHandler::handle_offer(const std::string& room_id,
                                     const std::string& from_id,
                                     const std::string& to_id,
                                     const json& sdp) {
    send_to_peer(room_id, from_id, to_id, {
        {"type", "offer"},
        {"from", from_id},
        {"sdp", sdp}
    });
}

void SignalingHandler::handle_answer(const std::string& room_id,
                                      const std::string& from_id,
                                      const std::string& to_id,
                                      const json& sdp) {
    send_to_peer(room_id, from_id, to_id, {
        {"type", "answer"},
        {"from", from_id},
        {"sdp", sdp}
    });
}

void SignalingHandler::handle_ice_candidate(const std::string& room_id,
                                             const std::string& from_id,
                                             const std::string& to_id,
                                             const json& candidate) {
    send_to_peer(room_id, from_id, to_id, {
        {"type", "ice-candidate"},
        {"from", from_id},
        {"candidate", candidate}
    });
}

void SignalingHandler::update_participant(const std::string& room_id,
                                           const std::string& participant_id,
                                           bool has_video,
                                           bool has_audio,
                                           bool screen_sharing) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = rooms_.find(room_id);
    if (room_it == rooms_.end()) return;
    
    auto participant_it = room_it->second->participants.find(participant_id);
    if (participant_it == room_it->second->participants.end()) return;
    
    auto& p = participant_it->second;
    p->has_video = has_video;
    p->has_audio = has_audio;
    p->is_screen_sharing = screen_sharing;
    
    broadcast_to_room(room_id, participant_id, {
        {"type", "participant-updated"},
        {"participant_id", participant_id},
        {"has_video", has_video},
        {"has_audio", has_audio},
        {"is_screen_sharing", screen_sharing}
    });
}

std::shared_ptr<Participant> SignalingHandler::get_participant(
    const std::string& room_id,
    const std::string& participant_id) {
    
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = rooms_.find(room_id);
    if (room_it == rooms_.end()) return nullptr;
    
    auto participant_it = room_it->second->participants.find(participant_id);
    if (participant_it == room_it->second->participants.end()) return nullptr;
    
    return participant_it->second;
}

std::vector<std::shared_ptr<Participant>> SignalingHandler::get_participants(
    const std::string& room_id) {
    
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = rooms_.find(room_id);
    if (room_it == rooms_.end()) return {};
    
    std::vector<std::shared_ptr<Participant>> result;
    for (auto& [id, p] : room_it->second->participants) {
        result.push_back(p);
    }
    
    return result;
}

ServerStats SignalingHandler::get_stats() const {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    ServerStats stats;
    stats.start_time = start_time_;
    stats.total_rooms = rooms_.size();
    stats.total_connections = conn_to_participant_.size();
    stats.messages_sent = messages_sent_.load();
    stats.messages_received = messages_received_.load();
    stats.errors = errors_.load();
    
    for (const auto& [id, room] : rooms_) {
        if (!room->participants.empty()) {
            ++stats.active_rooms;
            stats.total_participants += room->participants.size();
        }
    }
    
    return stats;
}

size_t SignalingHandler::get_room_count() const {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    return rooms_.size();
}

size_t SignalingHandler::get_participant_count(const std::string& room_id) const {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = rooms_.find(room_id);
    if (room_it == rooms_.end()) return 0;
    
    return room_it->second->participants.size();
}

std::optional<std::string> SignalingHandler::get_room_for_connection(
    const drogon::WebSocketConnectionPtr& conn) const {
    
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto it = conn_to_room_.find(conn);
    if (it != conn_to_room_.end()) {
        return it->second;
    }
    
    return std::nullopt;
}

void SignalingHandler::start_heartbeat(const drogon::WebSocketConnectionPtr& conn,
                                        const std::string& room_id,
                                        const std::string& participant_id) {
    // Heartbeat is handled automatically via message timestamps
}

void SignalingHandler::stop_heartbeat(const drogon::WebSocketConnectionPtr& conn) {
    std::lock_guard<std::shared_mutex> lock(mutex_);
    last_heartbeat_.erase(conn);
}

void SignalingHandler::send_to_peer(const std::string& room_id,
                                     const std::string& from_id,
                                     const std::string& to_id,
                                     const json& message) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = rooms_.find(room_id);
    if (room_it == rooms_.end()) return;
    
    auto room = room_it->second;
    auto target_it = room->participants.find(to_id);
    if (target_it != room->participants.end()) {
        auto& target = target_it->second;
        if (target->connection && target->connection->connected()) {
            std::string msg_str = message.dump();
            target->connection->send(msg_str);
            ++messages_sent_;
        }
    }
}

void SignalingHandler::broadcast_to_room(const std::string& room_id,
                                          const std::string& from_id,
                                          const json& message) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = rooms_.find(room_id);
    if (room_it == rooms_.end()) return;
    
    auto room = room_it->second;
    for (auto& [pid, participant] : room->participants) {
        if (pid != from_id && participant->connection &&
            participant->connection->connected()) {
            std::string msg_str = message.dump();
            participant->connection->send(msg_str);
            ++messages_sent_;
        }
    }
}

void SignalingHandler::cleanup_empty_rooms() {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto it = rooms_.begin();
    while (it != rooms_.end()) {
        if (it->second->participants.empty()) {
            LOG_INFO("Cleaning up empty room: " + it->first);
            it = rooms_.erase(it);
        } else {
            ++it;
        }
    }
}

void SignalingHandler::cleanup_stale_connections() {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto now = std::chrono::steady_clock::now();
    auto threshold = std::chrono::seconds(HEARTBEAT_TIMEOUT_SECONDS);
    
    for (auto it = last_heartbeat_.begin(); it != last_heartbeat_.end();) {
        if (now - it->second > threshold) {
            auto conn = it->first;
            LOG_INFO("Cleaning up stale connection");
            
            // Remove from room
            auto conn_it = conn_to_participant_.find(conn);
            if (conn_it != conn_to_participant_.end()) {
                std::string participant_id = conn_it->second;
                std::string room_id = conn_to_room_[conn];
                
                auto room_it = rooms_.find(room_id);
                if (room_it != rooms_.end()) {
                    room_it->second->participants.erase(participant_id);
                }
                
                conn_to_participant_.erase(conn_it);
                conn_to_room_.erase(conn);
            }
            
            it = last_heartbeat_.erase(it);
            
            if (conn->connected()) {
                conn->disconnect();
            }
        } else {
            ++it;
        }
    }
}

std::string SignalingHandler::generate_room_code() {
    static const char* chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(0, strlen(chars) - 1);
    
    std::string code;
    code.reserve(6);
    
    for (int i = 0; i < 6; ++i) {
        code += chars[dis(gen)];
    }
    
    return code;
}

} // namespace vidor
