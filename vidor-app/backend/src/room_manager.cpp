#include "room_manager.h"
#include "logger.h"
#include <random>
#include <algorithm>

namespace vidor {

RoomManager::RoomManager() {
    // Initialize with some cleanup
    cleanup_old_data();
}

RoomManager::~RoomManager() {
    // Cleanup on destruction
    cleanup_old_data();
}

bool RoomManager::initialize(const std::string& database_url) {
    database_url_ = database_url;
    
    if (!database_url.empty()) {
        // In production, initialize database connection here
        // For now, we'll use in-memory storage
        persistent_ = false;
        LOG_INFO("RoomManager initialized with in-memory storage");
    } else {
        LOG_INFO("RoomManager initialized without database (ephemeral mode)");
    }
    
    return true;
}

std::string RoomManager::generate_room_id() {
    // Generate UUID-like ID
    static std::random_device rd;
    static std::mt19937_64 gen(rd());
    static std::uniform_int_distribution<uint64_t> dis;
    
    std::ostringstream oss;
    oss << std::hex << std::setfill('0');
    oss << std::setw(8) << (dis(gen) & 0xFFFFFFFF) << "-";
    oss << std::setw(4) << (dis(gen) & 0xFFFF) << "-";
    oss << std::setw(4) << (dis(gen) & 0xFFFF) << "-";
    oss << std::setw(4) << (dis(gen) & 0xFFFF) << "-";
    oss << std::setw(12) << (dis(gen) & 0xFFFFFFFFFFFF);
    
    return oss.str();
}

std::string RoomManager::generate_room_code() {
    static const char* chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(0, strlen(chars) - 1);
    
    std::string code;
    code.reserve(ROOM_CODE_LENGTH);
    
    for (int i = 0; i < ROOM_CODE_LENGTH; ++i) {
        code += chars[dis(gen)];
    }
    
    return code;
}

std::string RoomManager::create_room(const std::string& creator_id,
                                      const std::string& name,
                                      const json& settings,
                                      int max_participants) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    std::string room_id = generate_room_id();
    std::string code;
    
    // Generate unique code
    do {
        code = generate_room_code();
    } while (room_code_map_.find(code) != room_code_map_.end());
    
    RoomData room;
    room.id = room_id;
    room.code = code;
    room.name = name.empty() ? "Room " + code : name;
    room.creator_id = creator_id;
    room.created_at = std::chrono::system_clock::now();
    room.updated_at = room.created_at;
    room.expires_at = room.created_at + std::chrono::hours(DEFAULT_EXPIRY_HOURS);
    room.is_active = true;
    room.max_participants = max_participants;
    room.settings = settings;
    
    rooms_[room_id] = room;
    room_code_map_[code] = room_id;
    room_participants_[room_id] = {};
    
    ++room_counter_;
    
    LOG_INFO("Room created: " + room_id + " (code: " + code + ")");
    
    return room_id;
}

std::optional<RoomData> RoomManager::get_room(const std::string& room_id) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto it = rooms_.find(room_id);
    if (it != rooms_.end()) {
        return it->second;
    }
    
    return std::nullopt;
}

std::optional<RoomData> RoomManager::get_room_by_code(const std::string& code) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto it = room_code_map_.find(code);
    if (it != room_code_map_.end()) {
        auto room_it = rooms_.find(it->second);
        if (room_it != rooms_.end()) {
            return room_it->second;
        }
    }
    
    return std::nullopt;
}

bool RoomManager::update_room(const std::string& room_id, const json& updates) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto it = rooms_.find(room_id);
    if (it == rooms_.end()) {
        return false;
    }
    
    RoomData& room = it->second;
    
    if (updates.contains("name")) {
        room.name = updates["name"].get<std::string>();
    }
    
    if (updates.contains("is_active")) {
        room.is_active = updates["is_active"].get<bool>();
    }
    
    if (updates.contains("max_participants")) {
        room.max_participants = updates["max_participants"].get<int>();
    }
    
    if (updates.contains("settings")) {
        room.settings = updates["settings"];
    }
    
    if (updates.contains("metadata")) {
        room.metadata = updates["metadata"];
    }
    
    room.updated_at = std::chrono::system_clock::now();
    
    LOG_INFO("Room updated: " + room_id);
    
    return true;
}

bool RoomManager::delete_room(const std::string& room_id) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto it = rooms_.find(room_id);
    if (it == rooms_.end()) {
        return false;
    }
    
    // Remove code mapping
    room_code_map_.erase(it->second.code);
    
    // Remove participants
    room_participants_.erase(room_id);
    
    // Remove room
    rooms_.erase(it);
    
    LOG_INFO("Room deleted: " + room_id);
    
    return true;
}

std::vector<RoomData> RoomManager::list_active_rooms(size_t limit, size_t offset) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    std::vector<RoomData> result;
    auto now = std::chrono::system_clock::now();
    
    for (const auto& [id, room] : rooms_) {
        if (room.is_active && (!room.expires_at || room.expires_at > now)) {
            if (offset > 0) {
                --offset;
                continue;
            }
            
            result.push_back(room);
            
            if (result.size() >= limit) {
                break;
            }
        }
    }
    
    return result;
}

bool RoomManager::room_exists(const std::string& room_id) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    return rooms_.find(room_id) != rooms_.end();
}

std::string RoomManager::add_participant(const std::string& room_id,
                                          const std::string& user_id,
                                          const std::string& name,
                                          bool is_host) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = rooms_.find(room_id);
    if (room_it == rooms_.end()) {
        return "";
    }
    
    // Check if user already in room
    auto& participants = room_participants_[room_id];
    for (const auto& p : participants) {
        if (p.user_id == user_id && !p.left_at) {
            return p.id; // Return existing participant ID
        }
    }
    
    // Create new participant
    ParticipantData participant;
    participant.id = generate_room_id();
    participant.room_id = room_id;
    participant.user_id = user_id;
    participant.name = name;
    participant.joined_at = std::chrono::system_clock::now();
    participant.is_host = is_host;
    
    participants.push_back(participant);
    
    LOG_INFO("Participant added to room " + room_id + ": " + participant.id);
    
    return participant.id;
}

std::optional<ParticipantData> RoomManager::get_participant(
    const std::string& room_id,
    const std::string& participant_id) {
    
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = room_participants_.find(room_id);
    if (room_it == room_participants_.end()) {
        return std::nullopt;
    }
    
    for (const auto& p : room_it->second) {
        if (p.id == participant_id) {
            return p;
        }
    }
    
    return std::nullopt;
}

bool RoomManager::remove_participant(const std::string& room_id,
                                      const std::string& participant_id) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = room_participants_.find(room_id);
    if (room_it == room_participants_.end()) {
        return false;
    }
    
    for (auto& p : room_it->second) {
        if (p.id == participant_id) {
            p.left_at = std::chrono::system_clock::now();
            LOG_INFO("Participant left room " + room_id + ": " + participant_id);
            return true;
        }
    }
    
    return false;
}

std::vector<ParticipantData> RoomManager::get_room_participants(
    const std::string& room_id) {
    
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = room_participants_.find(room_id);
    if (room_it == room_participants_.end()) {
        return {};
    }
    
    std::vector<ParticipantData> result;
    for (const auto& p : room_it->second) {
        if (!p.left_at) { // Only active participants
            result.push_back(p);
        }
    }
    
    return result;
}

size_t RoomManager::get_participant_count(const std::string& room_id) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    auto room_it = room_participants_.find(room_id);
    if (room_it == room_participants_.end()) {
        return 0;
    }
    
    size_t count = 0;
    for (const auto& p : room_it->second) {
        if (!p.left_at) {
            ++count;
        }
    }
    
    return count;
}

void RoomManager::cleanup_expired_rooms() {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto now = std::chrono::system_clock::now();
    
    for (auto it = rooms_.begin(); it != rooms_.end();) {
        if (it->second.expires_at && it->second.expires_at < now) {
            LOG_INFO("Cleaning up expired room: " + it->first);
            room_code_map_.erase(it->second.code);
            room_participants_.erase(it->first);
            it = rooms_.erase(it);
        } else {
            ++it;
        }
    }
}

void RoomManager::cleanup_stale_participants() {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    
    auto stale_threshold = std::chrono::system_clock::now() - std::chrono::hours(24);
    
    for (auto& [room_id, participants] : room_participants_) {
        for (auto& p : participants) {
            if (p.left_at && p.left_at < stale_threshold) {
                // Mark for removal (could be optimized)
                p.left_at = std::nullopt; // Reset to keep in memory for now
            }
        }
    }
}

void RoomManager::cleanup_old_data() {
    cleanup_expired_rooms();
    cleanup_stale_participants();
}

size_t RoomManager::get_room_count() const {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    return rooms_.size();
}

size_t RoomManager::get_total_participant_count() const {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    
    size_t count = 0;
    for (const auto& [room_id, participants] : room_participants_) {
        for (const auto& p : participants) {
            if (!p.left_at) {
                ++count;
            }
        }
    }
    
    return count;
}

} // namespace vidor
