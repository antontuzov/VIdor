#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <optional>
#include <nlohmann/json.hpp>

namespace vidor {

using json = nlohmann::json;

// Server configuration
struct ServerConfig {
    int port = 8080;
    std::string host = "0.0.0.0";
    int threads = 4;
    bool use_ssl = false;
    std::string ssl_cert;
    std::string ssl_key;
    int max_connections = 1000;
    int connection_timeout = 30; // seconds
};

// CORS configuration
struct CorsConfig {
    std::vector<std::string> allowed_origins;
    std::vector<std::string> allowed_methods;
    std::vector<std::string> allowed_headers;
    bool allow_credentials = true;
    int max_age = 86400; // 24 hours
};

// JWT configuration
struct JwtConfig {
    std::string secret;
    std::string issuer = "vidor-backend";
    std::string audience = "vidor-client";
    int expiry_seconds = 3600; // 1 hour
    std::string algorithm = "HS256";
};

// Voice API configuration
struct VoiceConfig {
    std::string api_key;
    std::string api_url = "https://dashscope.aliyuncs.com/api/v1/services/audio/transcription";
    std::string model = "paraformer-realtime-v2";
    std::string tts_model = "speech-synthesis-v2";
    int sample_rate = 16000;
    int chunk_duration_ms = 100; // 100ms chunks
    std::string language = "en";
    bool noise_suppression = true;
    bool echo_cancellation = true;
};

// TURN/STUN configuration
struct TurnConfig {
    std::string server;
    std::string username;
    std::string password;
    std::vector<std::string> ice_servers;
};

// Logging configuration
struct LoggingConfig {
    std::string level = "info"; // debug, info, warn, error
    std::string file;
    bool console = true;
    bool file_rotation = true;
    size_t max_file_size_mb = 100;
    int max_files = 5;
};

// Database configuration
struct DatabaseConfig {
    std::string url;
    std::string host;
    int port = 5432;
    std::string database;
    std::string username;
    std::string password;
    int max_connections = 10;
    int connection_timeout = 30;
};

// Rate limiting configuration
struct RateLimitConfig {
    bool enabled = true;
    int requests_per_minute = 60;
    int burst = 10;
    std::unordered_map<std::string, int> endpoint_limits;
};

class Config {
public:
    static Config& instance();
    
    // Load configuration from file
    bool load(const std::string& path = "config.json");
    
    // Get environment variable with default
    std::string get_env(const std::string& key, const std::string& default_val = "") const;
    
    // Getters
    const ServerConfig& server() const { return server_; }
    const CorsConfig& cors() const { return cors_; }
    const JwtConfig& jwt() const { return jwt_; }
    const VoiceConfig& voice() const { return voice_; }
    const TurnConfig& turn() const { return turn_; }
    const LoggingConfig& logging() const { return logging_; }
    const DatabaseConfig& database() const { return database_; }
    const RateLimitConfig& rate_limit() const { return rate_limit_; }
    
    // Validation
    bool validate() const;
    std::string get_validation_error() const { return validation_error_; }

private:
    Config() = default;
    ~Config() = default;
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;
    
    void substitute_env(std::string& value) const;
    void parse_server(const json& j);
    void parse_cors(const json& j);
    void parse_jwt(const json& j);
    void parse_voice(const json& j);
    void parse_turn(const json& j);
    void parse_logging(const json& j);
    void parse_database(const json& j);
    void parse_rate_limit(const json& j);
    
    json raw_json_;
    std::string validation_error_;
    
    ServerConfig server_;
    CorsConfig cors_;
    JwtConfig jwt_;
    VoiceConfig voice_;
    TurnConfig turn_;
    LoggingConfig logging_;
    DatabaseConfig database_;
    RateLimitConfig rate_limit_;
};

} // namespace vidor
