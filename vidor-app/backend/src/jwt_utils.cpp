#include "jwt_utils.h"
#include "config.h"
#include "logger.h"
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <openssl/sha.h>
#include <openssl/bio.h>
#include <openssl/buffer.h>
#include <chrono>
#include <stdexcept>

namespace vidor {

std::string JwtUtils::secret_;
std::string JwtUtils::issuer_;
std::string JwtUtils::audience_;
int JwtUtils::expiry_seconds_ = 3600;
bool JwtUtils::initialized_ = false;
std::string JwtUtils::algorithm_ = "HS256";

bool JwtUtils::initialize(const std::string& secret,
                          const std::string& issuer,
                          const std::string& audience,
                          int expiry_seconds) {
    if (secret.empty()) {
        LOG_ERROR("JWT secret cannot be empty");
        return false;
    }
    
    if (secret.length() < 32) {
        LOG_WARN("JWT secret is less than 32 characters - consider using a stronger secret");
    }
    
    secret_ = secret;
    issuer_ = issuer;
    audience_ = audience;
    expiry_seconds_ = expiry_seconds;
    initialized_ = true;
    
    LOG_INFO("JWT initialized with algorithm: " + algorithm_);
    return true;
}

std::string JwtUtils::generate_token(const JwtPayload& payload) {
    if (!initialized_) {
        throw std::runtime_error("JWT not initialized");
    }
    
    // Create header
    json header = {
        {"alg", algorithm_},
        {"typ", "JWT"}
    };
    
    // Create payload
    auto now = std::chrono::system_clock::now();
    auto expiry = now + std::chrono::seconds(expiry_seconds_);
    
    json payload_json = {
        {"user_id", payload.user_id},
        {"room_id", payload.room_id},
        {"name", payload.name},
        {"role", payload.role},
        {"iat", std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count()},
        {"exp", std::chrono::duration_cast<std::chrono::seconds>(expiry.time_since_epoch()).count()},
        {"iss", issuer_},
        {"aud", audience_}
    };
    
    // Base64url encode header and payload
    std::string header_json = header.dump();
    std::string payload_json_str = payload_json.dump();
    
    std::string header_b64 = base64url_encode(header_json);
    std::string payload_b64 = base64url_encode(payload_json_str);
    
    // Create signature
    std::string signature = create_signature(header_b64, payload_b64);
    
    // Combine parts
    return header_b64 + "." + payload_b64 + "." + signature;
}

std::string JwtUtils::generate_token(const std::string& user_id,
                                      const std::string& room_id,
                                      const std::string& name,
                                      const std::string& role) {
    JwtPayload payload;
    payload.user_id = user_id;
    payload.room_id = room_id;
    payload.name = name;
    payload.role = role;
    payload.issuer = issuer_;
    payload.audience = audience_;
    
    return generate_token(payload);
}

std::pair<JwtValidationResult, std::optional<JwtPayload>>
JwtUtils::validate_token(const std::string& token) {
    if (!initialized_) {
        return {JwtValidationResult::Malformed, std::nullopt};
    }
    
    // Split token into parts
    size_t first_dot = token.find('.');
    size_t second_dot = token.find('.', first_dot + 1);
    
    if (first_dot == std::string::npos || second_dot == std::string::npos) {
        return {JwtValidationResult::Malformed, std::nullopt};
    }
    
    std::string header_b64 = token.substr(0, first_dot);
    std::string payload_b64 = token.substr(first_dot + 1, second_dot - first_dot - 1);
    std::string signature_b64 = token.substr(second_dot + 1);
    
    // Verify signature
    if (!verify_signature(header_b64, payload_b64, signature_b64)) {
        return {JwtValidationResult::InvalidSignature, std::nullopt};
    }
    
    // Decode payload
    try {
        std::string payload_json = base64url_decode(payload_b64);
        json payload_json_obj = json::parse(payload_json);
        
        auto payload = JwtPayload::from_json(payload_json_obj);
        if (!payload) {
            return {JwtValidationResult::MissingClaims, std::nullopt};
        }
        
        // Check expiration
        auto now = std::chrono::system_clock::now();
        auto now_epoch = std::chrono::duration_cast<std::chrono::seconds>(
            now.time_since_epoch()
        ).count();
        
        if (payload->expires_at < now_epoch) {
            return {JwtValidationResult::Expired, std::nullopt};
        }
        
        if (payload->issued_at > now_epoch) {
            return {JwtValidationResult::NotYetValid, std::nullopt};
        }
        
        // Check issuer
        if (!issuer_.empty() && payload->issuer != issuer_) {
            return {JwtValidationResult::InvalidIssuer, std::nullopt};
        }
        
        // Check audience
        if (!audience_.empty() && payload->audience != audience_) {
            return {JwtValidationResult::InvalidAudience, std::nullopt};
        }
        
        return {JwtValidationResult::Valid, payload};
        
    } catch (const json::exception&) {
        return {JwtValidationResult::Malformed, std::nullopt};
    }
}

bool JwtUtils::is_expired(const std::string& token) {
    auto [result, payload] = validate_token(token);
    
    if (result == JwtValidationResult::Expired) {
        return true;
    }
    
    if (!payload) {
        return true; // Invalid tokens are treated as expired
    }
    
    return false;
}

std::optional<std::chrono::system_clock::time_point>
JwtUtils::get_expiration(const std::string& token) {
    auto [result, payload] = validate_token(token);
    
    if (!payload) {
        return std::nullopt;
    }
    
    return std::chrono::system_clock::from_time_t(payload->expires_at);
}

std::string JwtUtils::refresh_token(const std::string& token) {
    auto [result, payload] = validate_token(token);
    
    if (result != JwtValidationResult::Valid && result != JwtValidationResult::Expired) {
        throw std::runtime_error("Cannot refresh invalid token");
    }
    
    // Create new token with same claims
    JwtPayload new_payload;
    new_payload.user_id = payload->user_id;
    new_payload.room_id = payload->room_id;
    new_payload.name = payload->name;
    new_payload.role = payload->role;
    new_payload.issuer = issuer_;
    new_payload.audience = audience_;
    
    return generate_token(new_payload);
}

std::string JwtUtils::validation_result_to_string(JwtValidationResult result) {
    switch (result) {
        case JwtValidationResult::Valid: return "Valid";
        case JwtValidationResult::InvalidSignature: return "Invalid signature";
        case JwtValidationResult::Expired: return "Token expired";
        case JwtValidationResult::NotYetValid: return "Token not yet valid";
        case JwtValidationResult::InvalidIssuer: return "Invalid issuer";
        case JwtValidationResult::InvalidAudience: return "Invalid audience";
        case JwtValidationResult::Malformed: return "Malformed token";
        case JwtValidationResult::MissingClaims: return "Missing claims";
        default: return "Unknown error";
    }
}

// Base64 utilities
std::string JwtUtils::base64_encode(const std::string& input) {
    BIO* bio = BIO_new(BIO_f_base64());
    BIO_set_flags(bio, BIO_FLAGS_BASE64_NO_NL);
    
    BIO* mem = BIO_new(BIO_s_mem());
    bio = BIO_push(bio, mem);
    
    BIO_write(bio, input.c_str(), static_cast<int>(input.length()));
    BIO_flush(bio);
    
    BUF_MEM* buffer_ptr;
    BIO_get_mem_ptr(bio, &buffer_ptr);
    
    std::string result(buffer_ptr->data, buffer_ptr->length);
    BIO_free_all(bio);
    
    return result;
}

std::string JwtUtils::base64_decode(const std::string& input) {
    BIO* bio = BIO_new(BIO_f_base64());
    BIO_set_flags(bio, BIO_FLAGS_BASE64_NO_NL);
    
    BIO* mem = BIO_new_mem_buf(input.c_str(), static_cast<int>(input.length()));
    bio = BIO_push(bio, mem);
    
    std::vector<char> buffer(input.length());
    int len = BIO_read(bio, buffer.data(), static_cast<int>(input.length()));
    
    std::string result(buffer.data(), len);
    BIO_free_all(bio);
    
    return result;
}

std::string JwtUtils::base64url_encode(const std::string& input) {
    std::string result = base64_encode(input);
    
    // Replace base64 characters with URL-safe variants
    for (char& c : result) {
        if (c == '+') c = '-';
        else if (c == '/') c = '_';
        else if (c == '=') c = '\0'; // Remove padding
    }
    
    // Remove null terminators
    result.erase(std::remove(result.begin(), result.end(), '\0'), result.end());
    
    return result;
}

std::string JwtUtils::base64url_decode(const std::string& input) {
    std::string decoded = input;
    
    // Replace URL-safe characters with base64 variants
    for (char& c : decoded) {
        if (c == '-') c = '+';
        else if (c == '_') c = '/';
    }
    
    // Add padding if needed
    while (decoded.length() % 4 != 0) {
        decoded += '=';
    }
    
    return base64_decode(decoded);
}

std::string JwtUtils::hmac_sign(const std::string& data, const std::string& key) {
    unsigned char hash[EVP_MAX_MD_SIZE];
    unsigned int hash_len = 0;
    
    HMAC(EVP_sha256(), key.c_str(), static_cast<int>(key.length()),
         reinterpret_cast<const unsigned char*>(data.c_str()), data.length(),
         hash, &hash_len);
    
    return std::string(reinterpret_cast<char*>(hash), hash_len);
}

bool JwtUtils::hmac_verify(const std::string& data, const std::string& signature,
                           const std::string& key) {
    std::string expected = hmac_sign(data, key);
    
    // Constant-time comparison
    if (expected.length() != signature.length()) {
        return false;
    }
    
    unsigned char result = 0;
    for (size_t i = 0; i < expected.length(); ++i) {
        result |= expected[i] ^ signature[i];
    }
    
    return result == 0;
}

std::string JwtUtils::create_signature(const std::string& header_b64,
                                        const std::string& payload_b64) {
    std::string data = header_b64 + "." + payload_b64;
    std::string signature = hmac_sign(data, secret_);
    return base64url_encode(signature);
}

bool JwtUtils::verify_signature(const std::string& header_b64,
                                 const std::string& payload_b64,
                                 const std::string& signature) {
    std::string data = header_b64 + "." + payload_b64;
    return hmac_verify(data, base64url_decode(signature), secret_);
}

} // namespace vidor
