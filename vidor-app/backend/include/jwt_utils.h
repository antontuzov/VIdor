#pragma once

#include <string>
#include <unordered_map>
#include <optional>
#include <nlohmann/json.hpp>
#include <chrono>

namespace vidor {

using json = nlohmann::json;

/**
 * JWT Token payload
 */
struct JwtPayload {
    std::string user_id;
    std::string room_id;
    std::string name;
    std::string role; // host, participant, guest
    int64_t issued_at;
    int64_t expires_at;
    std::string issuer;
    std::string audience;
    
    json to_json() const {
        return json{
            {"user_id", user_id},
            {"room_id", room_id},
            {"name", name},
            {"role", role},
            {"iat", issued_at},
            {"exp", expires_at},
            {"iss", issuer},
            {"aud", audience}
        };
    }
    
    static std::optional<JwtPayload> from_json(const json& j) {
        try {
            JwtPayload payload;
            payload.user_id = j.value("user_id", "");
            payload.room_id = j.value("room_id", "");
            payload.name = j.value("name", "");
            payload.role = j.value("role", "participant");
            payload.issued_at = j.value("iat", 0);
            payload.expires_at = j.value("exp", 0);
            payload.issuer = j.value("iss", "");
            payload.audience = j.value("aud", "");
            
            if (payload.user_id.empty() || payload.room_id.empty()) {
                return std::nullopt;
            }
            
            return payload;
        } catch (const json::exception&) {
            return std::nullopt;
        }
    }
};

/**
 * JWT Validation result
 */
enum class JwtValidationResult {
    Valid,
    InvalidSignature,
    Expired,
    NotYetValid,
    InvalidIssuer,
    InvalidAudience,
    Malformed,
    MissingClaims
};

/**
 * JWT Utility class for token generation and validation
 */
class JwtUtils {
public:
    // Initialize with secret and configuration
    static bool initialize(const std::string& secret, 
                           const std::string& issuer = "vidor-backend",
                           const std::string& audience = "vidor-client",
                           int expiry_seconds = 3600);
    
    // Generate a new JWT token
    static std::string generate_token(const JwtPayload& payload);
    
    // Generate token with minimal parameters
    static std::string generate_token(const std::string& user_id, 
                                       const std::string& room_id,
                                       const std::string& name = "",
                                       const std::string& role = "participant");
    
    // Validate and decode a JWT token
    static std::pair<JwtValidationResult, std::optional<JwtPayload>> 
    validate_token(const std::string& token);
    
    // Check if token is expired
    static bool is_expired(const std::string& token);
    
    // Get expiration time
    static std::optional<std::chrono::system_clock::time_point> 
    get_expiration(const std::string& token);
    
    // Refresh token (extend expiration)
    static std::string refresh_token(const std::string& token);
    
    // Get validation result as string
    static std::string validation_result_to_string(JwtValidationResult result);
    
    // Check if initialized
    static bool is_initialized() { return initialized_; }
    
private:
    static std::string base64_encode(const std::string& input);
    static std::string base64_decode(const std::string& input);
    static std::string base64url_encode(const std::string& input);
    static std::string base64url_decode(const std::string& input);
    static std::string hmac_sign(const std::string& data, const std::string& key);
    static bool hmac_verify(const std::string& data, const std::string& signature, 
                            const std::string& key);
    static std::string create_signature(const std::string& header_b64, 
                                         const std::string& payload_b64);
    static bool verify_signature(const std::string& header_b64, 
                                  const std::string& payload_b64,
                                  const std::string& signature);
    
    static std::string secret_;
    static std::string issuer_;
    static std::string audience_;
    static int expiry_seconds_;
    static bool initialized_;
    static std::string algorithm_; // HS256
};

} // namespace vidor
