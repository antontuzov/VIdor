#include "config.h"
#include "logger.h"
#include <fstream>
#include <iostream>
#include <cstdlib>
#include <regex>
#include <sstream>

namespace vidor {

Config& Config::instance() {
    static Config instance;
    return instance;
}

bool Config::load(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) {
        std::cerr << "Config file not found: " << path << std::endl;
        return false;
    }
    
    try {
        file >> raw_json_;
    } catch (const json::exception& e) {
        std::cerr << "Failed to parse config: " << e.what() << std::endl;
        return false;
    }
    
    // Parse all sections
    if (raw_json_.contains("server")) {
        parse_server(raw_json_["server"]);
    }
    
    if (raw_json_.contains("cors")) {
        parse_cors(raw_json_["cors"]);
    }
    
    if (raw_json_.contains("jwt")) {
        parse_jwt(raw_json_["jwt"]);
    }
    
    if (raw_json_.contains("voice")) {
        parse_voice(raw_json_["voice"]);
    }
    
    if (raw_json_.contains("turn")) {
        parse_turn(raw_json_["turn"]);
    }
    
    if (raw_json_.contains("logging")) {
        parse_logging(raw_json_["logging"]);
    }
    
    if (raw_json_.contains("database")) {
        parse_database(raw_json_["database"]);
    }
    
    if (raw_json_.contains("rate_limit")) {
        parse_rate_limit(raw_json_["rate_limit"]);
    }
    
    LOG_INFO("Configuration loaded from " + path);
    return true;
}

std::string Config::get_env(const std::string& key, const std::string& default_val) const {
    const char* env_val = std::getenv(key.c_str());
    return env_val ? std::string(env_val) : default_val;
}

bool Config::validate() const {
    // JWT secret is required
    if (jwt_.secret.empty()) {
        validation_error_ = "JWT secret is required";
        return false;
    }
    
    // JWT secret should be at least 32 characters
    if (jwt_.secret.length() < 32) {
        validation_error_ = "JWT secret should be at least 32 characters for security";
        return false;
    }
    
    // Port should be in valid range
    if (server_.port < 1 || server_.port > 65535) {
        validation_error_ = "Invalid server port";
        return false;
    }
    
    // Thread count should be positive
    if (server_.threads < 1) {
        validation_error_ = "Thread count must be at least 1";
        return false;
    }
    
    return true;
}

void Config::substitute_env(std::string& value) const {
    // Pattern: ${VAR_NAME}
    std::regex env_pattern(R"(\$\{([^}]+)\})");
    std::smatch matches;
    
    std::string result = value;
    while (std::regex_search(result, matches, env_pattern)) {
        std::string var_name = matches[1].str();
        std::string env_val = get_env(var_name, "");
        
        if (!env_val.empty()) {
            result = result.replace(matches.position(), matches.length(), env_val);
        } else {
            // Keep the placeholder if env var is not set
            break;
        }
    }
    
    value = result;
}

void Config::parse_server(const json& j) {
    server_.port = j.value("port", 8080);
    server_.host = j.value("host", "0.0.0.0");
    server_.threads = j.value("threads", 4);
    server_.use_ssl = j.value("use_ssl", false);
    server_.ssl_cert = j.value("ssl_cert", "");
    server_.ssl_key = j.value("ssl_key", "");
    server_.max_connections = j.value("max_connections", 1000);
    server_.connection_timeout = j.value("connection_timeout", 30);
}

void Config::parse_cors(const json& j) {
    if (j.contains("allowed_origins")) {
        for (const auto& origin : j["allowed_origins"]) {
            cors_.allowed_origins.push_back(origin.get<std::string>());
        }
    }
    
    if (j.contains("allowed_methods")) {
        for (const auto& method : j["allowed_methods"]) {
            cors_.allowed_methods.push_back(method.get<std::string>());
        }
    }
    
    if (j.contains("allowed_headers")) {
        for (const auto& header : j["allowed_headers"]) {
            cors_.allowed_headers.push_back(header.get<std::string>());
        }
    }
    
    cors_.allow_credentials = j.value("allow_credentials", true);
    cors_.max_age = j.value("max_age", 86400);
}

void Config::parse_jwt(const json& j) {
    jwt_.secret = j.value("secret", "");
    jwt_.expiry_seconds = j.value("expiry_seconds", 3600);
    jwt_.issuer = j.value("issuer", "vidor-backend");
    jwt_.audience = j.value("audience", "vidor-client");
    jwt_.algorithm = j.value("algorithm", "HS256");
    
    // Substitute environment variables
    substitute_env(jwt_.secret);
}

void Config::parse_voice(const json& j) {
    voice_.api_key = j.value("api_key", "");
    voice_.api_url = j.value("api_url", "");
    voice_.model = j.value("model", "paraformer-realtime-v2");
    voice_.tts_model = j.value("tts_model", "speech-synthesis-v2");
    voice_.sample_rate = j.value("sample_rate", 16000);
    voice_.chunk_duration_ms = j.value("chunk_duration_ms", 100);
    voice_.language = j.value("language", "en");
    voice_.noise_suppression = j.value("noise_suppression", true);
    voice_.echo_cancellation = j.value("echo_cancellation", true);
    
    // Substitute environment variables
    substitute_env(voice_.api_key);
    substitute_env(voice_.api_url);
}

void Config::parse_turn(const json& j) {
    turn_.server = j.value("server", "");
    turn_.username = j.value("username", "vidor");
    turn_.password = j.value("password", "");
    
    if (j.contains("ice_servers")) {
        for (const auto& server : j["ice_servers"]) {
            turn_.ice_servers.push_back(server.get<std::string>());
        }
    }
    
    // Substitute environment variables
    substitute_env(turn_.server);
    substitute_env(turn_.password);
}

void Config::parse_logging(const json& j) {
    logging_.level = j.value("level", "info");
    logging_.file = j.value("file", "");
    logging_.console = j.value("console", true);
    logging_.file_rotation = j.value("file_rotation", true);
    logging_.max_file_size_mb = j.value("max_file_size_mb", 100);
    logging_.max_files = j.value("max_files", 5);
}

void Config::parse_database(const json& j) {
    database_.url = j.value("url", "");
    database_.host = j.value("host", "localhost");
    database_.port = j.value("port", 5432);
    database_.database = j.value("database", "vidor");
    database_.username = j.value("username", "vidor");
    database_.password = j.value("password", "");
    database_.max_connections = j.value("max_connections", 10);
    database_.connection_timeout = j.value("connection_timeout", 30);
    
    // Substitute environment variables
    substitute_env(database_.url);
    substitute_env(database_.password);
}

void Config::parse_rate_limit(const json& j) {
    rate_limit_.enabled = j.value("enabled", true);
    rate_limit_.requests_per_minute = j.value("requests_per_minute", 60);
    rate_limit_.burst = j.value("burst", 10);
    
    if (j.contains("endpoint_limits")) {
        for (auto& [endpoint, limit] : j["endpoint_limits"].items()) {
            rate_limit_.endpoint_limits[endpoint] = limit.get<int>();
        }
    }
}

} // namespace vidor
