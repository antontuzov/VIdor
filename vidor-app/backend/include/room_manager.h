#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <memory>
#include <shared_mutex>
#include <optional>
#include <nlohmann/json.hpp>
#include <chrono>

namespace vidor {

using json = nlohmann::json;

/**
 * Room persistence data
 */
struct RoomData {
    std::string id;
    std::string code;
    std::string name;
    std::string creator_id;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;
    std::optional<std::chrono::system_clock::time_point> expires_at;
    bool is_active = true;
    int max_participants = 10;
    json settings;
    json metadata;
    
    json to_json() const {
        json j = {
            {"id", id},
            {"code", code},
            {"name", name},
            {"creator_id", creator_id},
            {"created_at", std::chrono::system_clock::to_time_t(created_at)},
            {"updated_at", std::chrono::system_clock::to_time_t(updated_at)},
            {"is_active", is_active},
            {"max_participants", max_participants},
            {"settings", settings},
            {"metadata", metadata}
        };
        
        if (expires_at) {
            j["expires_at"] = std::chrono::system_clock::to_time_t(*expires_at);
        }
        
        return j;
    }
};

/**
 * Participant persistence data
 */
struct ParticipantData {
    std::string id;
    std::string room_id;
    std::string user_id;
    std::string name;
    std::chrono::system_clock::time_point joined_at;
    std::optional<std::chrono::system_clock::time_point> left_at;
    bool is_host = false;
    json settings;
    
    json to_json() const {
        json j = {
            {"id", id},
            {"room_id", room_id},
            {"user_id", user_id},
            {"name", name},
            {"joined_at", std::chrono::system_clock::to_time_t(joined_at)},
            {"is_host", is_host},
            {"settings", settings}
        };
        
        if (left_at) {
            j["left_at"] = std::chrono::system_clock::to_time_t(*left_at);
        }
        
        return j;
    }
};

/**
 * Room Manager - handles room persistence and lifecycle
 */
class RoomManager {
public:
    RoomManager();
    ~RoomManager();
    
    // Initialize with database connection string (optional)
    bool initialize(const std::string& database_url = "");
    
    // Check if using database
    bool is_persistent() const { return persistent_; }
    
    // === Room Operations ===
    
    // Create a new room
    std::string create_room(const std::string& creator_id, 
                            const std::string& name = "",
                            const json& settings = {},
                            int max_participants = 10);
    
    // Get room by ID
    std::optional<RoomData> get_room(const std::string& room_id);
    
    // Get room by code
    std::optional<RoomData> get_room_by_code(const std::string& code);
    
    // Update room
    bool update_room(const std::string& room_id, const json& updates);
    
    // Delete room
    bool delete_room(const std::string& room_id);
    
    // List active rooms
    std::vector<RoomData> list_active_rooms(size_t limit = 50, size_t offset = 0);
    
    // Check if room exists
    bool room_exists(const std::string& room_id);
    
    // === Participant Operations ===
    
    // Add participant to room
    std::string add_participant(const std::string& room_id, 
                                 const std::string& user_id,
                                 const std::string& name,
                                 bool is_host = false);
    
    // Get participant
    std::optional<ParticipantData> get_participant(const std::string& room_id,
                                                    const std::string& participant_id);
    
    // Remove participant (mark as left)
    bool remove_participant(const std::string& room_id, 
                            const std::string& participant_id);
    
    // Get participants in room
    std::vector<ParticipantData> get_room_participants(const std::string& room_id);
    
    // Get participant count
    size_t get_participant_count(const std::string& room_id);
    
    // === Cleanup ===
    
    // Cleanup expired rooms
    void cleanup_expired_rooms();
    
    // Cleanup old participants
    void cleanup_stale_participants();
    
    // === Statistics ===
    
    size_t get_room_count() const;
    size_t get_total_participant_count() const;
    
private:
    std::string generate_room_id();
    std::string generate_room_code();
    void cleanup_old_data();
    
    mutable std::shared_mutex mutex_;
    std::unordered_map<std::string, RoomData> rooms_;
    std::unordered_map<std::string, std::string> room_code_map_; // code -> id
    std::unordered_map<std::string, std::vector<ParticipantData>> room_participants_;
    
    bool persistent_ = false;
    std::string database_url_;
    
    std::atomic<uint64_t> room_counter_{0};
    
    static constexpr int ROOM_CODE_LENGTH = 6;
    static constexpr int DEFAULT_EXPIRY_HOURS = 24;
};

} // namespace vidor
