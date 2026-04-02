#pragma once

#include <drogon/WebSocketConnection.h>
#include <nlohmann/json.hpp>
#include <unordered_map>
#include <unordered_set>
#include <shared_mutex>
#include <string>
#include <memory>
#include <queue>
#include <functional>
#include <chrono>

namespace vidor {

using json = nlohmann::json;

/**
 * Participant in a room
 */
struct Participant {
    std::string id;
    std::string name;
    drogon::WebSocketConnectionPtr connection;
    bool has_video = true;
    bool has_audio = true;
    bool is_screen_sharing = false;
    std::string role = "participant"; // host, participant, guest
    std::chrono::steady_clock::time_point joined_at;
    json metadata;
    
    Participant() = default;
    Participant(const std::string& id_, const std::string& name_, 
                const drogon::WebSocketConnectionPtr& conn)
        : id(id_), name(name_), connection(conn) 
    {
        joined_at = std::chrono::steady_clock::now();
    }
};

/**
 * Room containing participants
 */
struct Room {
    std::string id;
    std::string code; // Short human-readable code
    std::unordered_map<std::string, std::shared_ptr<Participant>> participants;
    std::chrono::steady_clock::time_point created_at;
    std::chrono::steady_clock::time_point updated_at;
    std::string creator_id;
    std::string name;
    int max_participants = 10;
    bool is_locked = false;
    bool require_password = false;
    std::string password_hash;
    json settings;
    json metadata;
    
    Room() = default;
    explicit Room(const std::string& id_) : id(id_) {
        created_at = std::chrono::steady_clock::now();
        updated_at = created_at;
    }
};

/**
 * ICE Candidate for WebRTC
 */
struct IceCandidate {
    std::string candidate;
    std::string sdp_mid;
    int sdp_mline_index = 0;
    std::string username_fragment;
    
    json to_json() const {
        return json{
            {"candidate", candidate},
            {"sdpMid", sdp_mid},
            {"sdpMLineIndex", sdp_mline_index},
            {"usernameFragment", username_fragment}
        };
    }
    
    static IceCandidate from_json(const json& j) {
        IceCandidate c;
        c.candidate = j.value("candidate", "");
        c.sdp_mid = j.value("sdpMid", "");
        c.sdp_mline_index = j.value("sdpMLineIndex", 0);
        c.username_fragment = j.value("usernameFragment", "");
        return c;
    }
};

/**
 * Signaling message types
 */
enum class MessageType {
    Join,
    Leave,
    Offer,
    Answer,
    IceCandidate,
    ParticipantJoined,
    ParticipantLeft,
    ParticipantUpdated,
    RoomLocked,
    RoomUnlocked,
    Error,
    Heartbeat,
    HeartbeatAck
};

/**
 * Parsed signaling message
 */
struct SignalingMessage {
    MessageType type;
    std::string room_id;
    std::string participant_id;
    std::string from_id;
    std::string to_id;
    std::string name;
    json sdp;
    IceCandidate candidate;
    std::string error;
    json data;
    
    json to_json() const {
        json j = {{"type", message_type_to_string(type)}};
        
        if (!room_id.empty()) j["room_id"] = room_id;
        if (!participant_id.empty()) j["participant_id"] = participant_id;
        if (!from_id.empty()) j["from"] = from_id;
        if (!to_id.empty()) j["to"] = to_id;
        if (!name.empty()) j["name"] = name;
        if (!sdp.is_null()) j["sdp"] = sdp;
        if (!candidate.candidate.empty()) j["candidate"] = candidate.to_json();
        if (!error.empty()) j["error"] = error;
        if (!data.is_null()) j["data"] = data;
        
        return j;
    }
    
    static std::string message_type_to_string(MessageType type) {
        switch (type) {
            case MessageType::Join: return "join";
            case MessageType::Leave: return "leave";
            case MessageType::Offer: return "offer";
            case MessageType::Answer: return "answer";
            case MessageType::IceCandidate: return "ice-candidate";
            case MessageType::ParticipantJoined: return "participant-joined";
            case MessageType::ParticipantLeft: return "participant-left";
            case MessageType::ParticipantUpdated: return "participant-updated";
            case MessageType::RoomLocked: return "room-locked";
            case MessageType::RoomUnlocked: return "room-unlocked";
            case MessageType::Error: return "error";
            case MessageType::Heartbeat: return "heartbeat";
            case MessageType::HeartbeatAck: return "heartbeat-ack";
            default: return "unknown";
        }
    }
    
    static MessageType message_type_from_string(const std::string& s) {
        if (s == "join") return MessageType::Join;
        if (s == "leave") return MessageType::Leave;
        if (s == "offer") return MessageType::Offer;
        if (s == "answer") return MessageType::Answer;
        if (s == "ice-candidate") return MessageType::IceCandidate;
        if (s == "participant-joined") return MessageType::ParticipantJoined;
        if (s == "participant-left") return MessageType::ParticipantLeft;
        if (s == "participant-updated") return MessageType::ParticipantUpdated;
        if (s == "room-locked") return MessageType::RoomLocked;
        if (s == "room-unlocked") return MessageType::RoomUnlocked;
        if (s == "error") return MessageType::Error;
        if (s == "heartbeat") return MessageType::Heartbeat;
        if (s == "heartbeat-ack") return MessageType::HeartbeatAck;
        return MessageType::Error;
    }
    
    static std::optional<SignalingMessage> from_json(const json& j) {
        SignalingMessage msg;
        
        try {
            std::string type_str = j.value("type", "");
            msg.type = message_type_from_string(type_str);
            
            if (msg.type == MessageType::Error && type_str != "error") {
                return std::nullopt; // Unknown message type
            }
            
            msg.room_id = j.value("room_id", "");
            msg.participant_id = j.value("participant_id", "");
            msg.from_id = j.value("from", "");
            msg.to_id = j.value("to", "");
            msg.name = j.value("name", "");
            msg.error = j.value("error", "");
            
            if (j.contains("sdp")) {
                msg.sdp = j["sdp"];
            }
            
            if (j.contains("candidate")) {
                msg.candidate = IceCandidate::from_json(j["candidate"]);
            }
            
            if (j.contains("data")) {
                msg.data = j["data"];
            }
            
            return msg;
        } catch (const json::exception&) {
            return std::nullopt;
        }
    }
};

/**
 * Statistics for monitoring
 */
struct ServerStats {
    size_t total_rooms = 0;
    size_t active_rooms = 0;
    size_t total_participants = 0;
    size_t total_connections = 0;
    std::chrono::steady_clock::time_point start_time;
    size_t messages_sent = 0;
    size_t messages_received = 0;
    size_t errors = 0;
    
    json to_json() const {
        auto uptime = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::steady_clock::now() - start_time
        ).count();
        
        return json{
            {"total_rooms", total_rooms},
            {"active_rooms", active_rooms},
            {"total_participants", total_participants},
            {"total_connections", total_connections},
            {"uptime_seconds", uptime},
            {"messages_sent", messages_sent},
            {"messages_received", messages_received},
            {"errors", errors}
        };
    }
};

/**
 * WebSocket Signaling Handler
 * Handles WebRTC signaling between peers in the same room
 */
class SignalingHandler {
public:
    SignalingHandler();
    ~SignalingHandler();
    
    // Connection lifecycle
    void on_connection(const drogon::WebSocketConnectionPtr& conn);
    void on_message(const drogon::WebSocketConnectionPtr& conn, const std::string& message);
    void on_close(const drogon::WebSocketConnectionPtr& conn);
    
    // Room operations
    std::string create_room(const std::string& creator_id, const json& settings = {});
    bool join_room(const std::string& room_id, const std::string& participant_id,
                   const std::string& name, const drogon::WebSocketConnectionPtr& conn);
    void leave_room(const std::string& room_id, const std::string& participant_id);
    bool delete_room(const std::string& room_id);
    
    // Room management
    void lock_room(const std::string& room_id);
    void unlock_room(const std::string& room_id);
    bool check_password(const std::string& room_id, const std::string& password);
    void set_password(const std::string& room_id, const std::string& password);
    
    // Signaling message handlers
    void handle_offer(const std::string& room_id, const std::string& from_id,
                      const std::string& to_id, const json& sdp);
    void handle_answer(const std::string& room_id, const std::string& from_id,
                       const std::string& to_id, const json& sdp);
    void handle_ice_candidate(const std::string& room_id, const std::string& from_id,
                              const std::string& to_id, const json& candidate);
    
    // Participant management
    void update_participant(const std::string& room_id, const std::string& participant_id,
                            bool has_video, bool has_audio, bool screen_sharing);
    std::shared_ptr<Participant> get_participant(const std::string& room_id, 
                                                  const std::string& participant_id);
    std::vector<std::shared_ptr<Participant>> get_participants(const std::string& room_id);
    
    // Stats
    ServerStats get_stats() const;
    size_t get_room_count() const;
    size_t get_participant_count(const std::string& room_id) const;
    std::optional<std::string> get_room_for_connection(const drogon::WebSocketConnectionPtr& conn) const;
    
    // Heartbeat
    void start_heartbeat(const drogon::WebSocketConnectionPtr& conn, const std::string& room_id,
                         const std::string& participant_id);
    void stop_heartbeat(const drogon::WebSocketConnectionPtr& conn);
    
private:
    void send_to_peer(const std::string& room_id, const std::string& from_id,
                      const std::string& to_id, const json& message);
    void broadcast_to_room(const std::string& room_id, const std::string& from_id,
                           const json& message);
    void cleanup_empty_rooms();
    void cleanup_stale_connections();
    std::string generate_room_code();
    
    mutable std::shared_mutex mutex_;
    std::unordered_map<std::string, std::shared_ptr<Room>> rooms_;
    std::unordered_map<drogon::WebSocketConnectionPtr, std::string> conn_to_participant_;
    std::unordered_map<drogon::WebSocketConnectionPtr, std::string> conn_to_room_;
    std::unordered_map<drogon::WebSocketConnectionPtr, std::chrono::steady_clock::time_point> last_heartbeat_;
    std::unordered_map<std::string, std::string> room_code_to_id_;
    
    std::atomic<uint64_t> room_counter_{0};
    std::atomic<size_t> messages_sent_{0};
    std::atomic<size_t> messages_received_{0};
    std::atomic<size_t> errors_{0};
    
    std::chrono::steady_clock::time_point start_time_;
    
    static constexpr int HEARTBEAT_INTERVAL_SECONDS = 30;
    static constexpr int HEARTBEAT_TIMEOUT_SECONDS = 90;
};

} // namespace vidor
