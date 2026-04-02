#include "server.h"
#include "signaling_handler.h"
#include "voice_proxy.h"
#include "config.h"
#include "logger.h"
#include "jwt_utils.h"
#include "room_manager.h"
#include <drogon/drogon.h>
#include <nlohmann/json.hpp>
#include <chrono>
#include <random>

namespace vidor {

using json = nlohmann::json;

namespace {
    std::unique_ptr<SignalingHandler> g_signaling_handler;
    std::unique_ptr<VoiceProxy> g_voice_proxy;
    std::unique_ptr<RoomManager> g_room_manager;
    
    std::string generate_user_id() {
        static std::random_device rd;
        static std::mt19937 gen(rd());
        static std::uniform_int_distribution<> dis(0, 15);
        
        const char* hex = "0123456789abcdef";
        std::string result;
        result.reserve(8);
        
        for (int i = 0; i < 8; ++i) {
            result += hex[dis(gen)];
        }
        
        return "user_" + result;
    }
}

VidorServer::VidorServer() 
    : app_(std::make_unique<drogon::HttpAppFramework>()) {}

VidorServer::~VidorServer() {
    shutdown();
}

bool VidorServer::initialize() {
    if (initialized_) {
        return true;
    }
    
    const auto& config = Config::instance();
    
    // Validate configuration
    if (!config.validate()) {
        LOG_ERROR("Configuration validation failed: " + config.get_validation_error());
        return false;
    }
    
    // Initialize logging
    setup_logging();
    
    // Initialize JWT
    if (!JwtUtils::initialize(config.jwt().secret, config.jwt().issuer, 
                              config.jwt().audience, config.jwt().expiry_seconds)) {
        LOG_ERROR("Failed to initialize JWT");
        return false;
    }
    
    // Initialize components
    g_signaling_handler = std::make_unique<SignalingHandler>();
    g_voice_proxy = std::make_unique<VoiceProxy>();
    g_room_manager = std::make_unique<RoomManager>();
    
    // Initialize voice proxy if API key is available
    if (!config.voice().api_key.empty()) {
        g_voice_proxy->initialize(config.voice().api_key, config.voice().api_url,
                                  config.voice().model, config.voice().sample_rate);
        LOG_INFO("Voice proxy initialized with model: " + config.voice().model);
    } else {
        LOG_WARN("No QWEN_API_KEY configured - voice features will be limited");
    }
    
    // Setup routes
    setup_routes();
    
    // Setup CORS
    setup_cors();
    
    // Setup WebSocket
    setup_websocket();
    
    // Setup middlewares
    setup_middlewares();
    
    // Configure server
    app_->setListenerAddress(config.server().host)
        .setListenerPort(config.server().port())
        .setThreadNum(config.server().threads());
    
    // SSL configuration
    if (config.server().use_ssl && !config.server().ssl_cert.empty() && 
        !config.server().ssl_key.empty()) {
        app_->setSSLConfigFiles(config.server().ssl_cert, config.server().ssl_key);
    }
    
    initialized_ = true;
    
    LOG_INFO("VidorServer initialized on " + config.server().host + ":" + 
             std::to_string(config.server().port()));
    
    return true;
}

void VidorServer::start() {
    if (!initialized_) {
        LOG_ERROR("Server not initialized");
        return;
    }
    
    running_ = true;
    LOG_INFO("Starting Vidor signaling server...");
    app_->run();
}

void VidorServer::shutdown() {
    if (running_) {
        running_ = false;
        LOG_INFO("Shutting down server...");
        drogon::app().quit();
    }
}

void VidorServer::setup_routes() {
    // Health check endpoint
    app_->registerHandler("/api/health", 
        [](const drogon::HttpRequestPtr& req,
           std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
            
            json response = {
                {"status", "ok"},
                {"timestamp", std::chrono::system_clock::now().time_since_epoch().count()},
                {"version", "1.0.0"}
            };
            
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
            resp->setBody(response.dump());
            callback(resp);
        },
        {drogon::Get}
    );
    
    // Stats endpoint
    app_->registerHandler("/api/stats",
        [](const drogon::HttpRequestPtr& req,
           std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
            
            if (g_signaling_handler) {
                auto stats = g_signaling_handler->get_stats();
                
                json response = stats.to_json();
                
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
                resp->setBody(response.dump());
                callback(resp);
            } else {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k503ServiceUnavailable);
                callback(resp);
            }
        },
        {drogon::Get}
    );
}

void VidorServer::setup_cors() {
    const auto& cors_config = Config::instance().cors();
    
    app_->setCorsHeaders([cors_config](const std::string& origin) {
        drogon::HttpHeaderMap headers;
        
        // Check if origin is allowed
        bool allowed = false;
        for (const auto& allowed_origin : cors_config.allowed_origins) {
            if (allowed_origin == "*" || allowed_origin == origin) {
                allowed = true;
                headers["Access-Control-Allow-Origin"] = allowed_origin == "*" ? "*" : origin;
                break;
            }
        }
        
        if (!allowed && !cors_config.allowed_origins.empty()) {
            headers["Access-Control-Allow-Origin"] = cors_config.allowed_origins[0];
        }
        
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS";
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-Room-ID";
        
        if (cors_config.allow_credentials) {
            headers["Access-Control-Allow-Credentials"] = "true";
        }
        
        headers["Access-Control-Max-Age"] = std::to_string(cors_config.max_age);
        
        return headers;
    });
}

void VidorServer::setup_websocket() {
    app_->registerWebSocketHandler("/ws/signaling",
        [](const drogon::HttpRequestPtr& req) {
            // Optional: Validate JWT token from query params or headers
            return nullptr; // Allow all connections
        },
        [](const drogon::WebSocketConnectionPtr& conn) {
            if (g_signaling_handler) {
                g_signaling_handler->on_connection(conn);
            }
        },
        [](const drogon::WebSocketConnectionPtr& conn,
           const std::string& message,
           const drogon::WebSocketMessageType& type) {
            
            if (g_signaling_handler && type == drogon::WebSocketMessageType::Text) {
                g_signaling_handler->on_message(conn, message);
            }
        },
        [](const drogon::WebSocketConnectionPtr& conn) {
            if (g_signaling_handler) {
                g_signaling_handler->on_close(conn);
            }
        }
    );
}

void VidorServer::setup_logging() {
    const auto& logging_config = Config::instance().logging();
    
    // Initialize global logger
    LogManager::instance().initialize(
        logging_config.level,
        logging_config.file,
        logging_config.console
    );
    
    // Set Drogon log level
    app_->setLogLevel([logging_config]() {
        if (logging_config.level == "debug") return drogon::LogLevel::Debug;
        if (logging_config.level == "info") return drogon::LogLevel::Info;
        if (logging_config.level == "warn") return drogon::LogLevel::Warn;
        if (logging_config.level == "error") return drogon::LogLevel::Error;
        return drogon::LogLevel::Info;
    }());
    
    if (!logging_config.file.empty()) {
        app_->setLogFileName(logging_config.file);
    }
}

void VidorServer::setup_middlewares() {
    // Request logging middleware
    app_->registerBeginningAdvice([](const drogon::HttpRequestPtr& req) {
        LOG_DEBUG_CAT("http", std::string(req->methodString()) + " " + std::string(req->path()));
    });
    
    // Response timing middleware
    app_->registerSendingAdvice([](const drogon::HttpRequestPtr& req,
                                    const drogon::HttpResponsePtr& resp) {
        // Could add timing headers here
    });
}

void VidorServer::setup_static_files() {
    // Serve static files if needed
    // app_->setDocumentRoot("./static");
}

// HealthController implementation
void HealthController::async_handle_http(
    const drogon::HttpRequestPtr& req,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    
    json response = {
        {"status", "ok"},
        {"timestamp", std::chrono::system_clock::now().time_since_epoch().count()},
        {"version", "1.0.0"},
        {"uptime", std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::steady_clock::now() - std::chrono::steady_clock::time_point()
        ).count()}
    };
    
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
    resp->setBody(response.dump());
    callback(resp);
}

// RoomController implementation
void RoomController::createRoom(
    const drogon::HttpRequestPtr& req,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    
    try {
        json body;
        if (req->contentType() == drogon::CT_APPLICATION_JSON) {
            body = json::parse(req->body());
        }
        
        std::string user_id = body.value("user_id", generate_user_id());
        std::string room_name = body.value("room_name", "");
        json settings = body.value("settings", json::object());
        
        // Create room via signaling handler
        std::string room_id = g_signaling_handler->create_room(user_id, settings);
        
        // Generate JWT token
        std::string token = JwtUtils::generate_token(user_id, room_id, "", "host");
        
        json response = {
            {"room_id", room_id},
            {"token", token},
            {"created_at", std::chrono::system_clock::now().time_since_epoch().count()}
        };
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        resp->setBody(response.dump());
        callback(resp);
        
    } catch (const std::exception& e) {
        LOG_ERROR("Create room error: " + std::string(e.what()));
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k500InternalServerError);
        resp->setBody(json{{"error", e.what()}}.dump());
        callback(resp);
    }
}

void RoomController::getRoomInfo(
    const drogon::HttpRequestPtr& req,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
    const std::string& room_id) {
    
    try {
        if (!g_signaling_handler) {
            throw std::runtime_error("Signaling handler not initialized");
        }
        
        size_t count = g_signaling_handler->get_participant_count(room_id);
        
        json response = {
            {"room_id", room_id},
            {"participant_count", count},
            {"status", count > 0 ? "active" : "waiting"}
        };
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        resp->setBody(response.dump());
        callback(resp);
        
    } catch (const std::exception& e) {
        LOG_ERROR("Get room info error: " + std::string(e.what()));
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k404NotFound);
        resp->setBody(json{{"error", "Room not found"}}.dump());
        callback(resp);
    }
}

void RoomController::deleteRoom(
    const drogon::HttpRequestPtr& req,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
    const std::string& room_id) {
    
    try {
        // In production, verify JWT token has permission to delete room
        
        if (g_signaling_handler->delete_room(room_id)) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k204NoContent);
            callback(resp);
        } else {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k404NotFound);
            resp->setBody(json{{"error", "Room not found"}}.dump());
            callback(resp);
        }
        
    } catch (const std::exception& e) {
        LOG_ERROR("Delete room error: " + std::string(e.what()));
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k500InternalServerError);
        resp->setBody(json{{"error", e.what()}}.dump());
        callback(resp);
    }
}

void RoomController::joinRoom(
    const drogon::HttpRequestPtr& req,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
    const std::string& room_id) {
    
    try {
        json body;
        if (req->contentType() == drogon::CT_APPLICATION_JSON) {
            body = json::parse(req->body());
        }
        
        std::string user_id = body.value("user_id", generate_user_id());
        std::string name = body.value("name", "Participant");
        
        // Generate JWT token for joining
        std::string token = JwtUtils::generate_token(user_id, room_id, name, "participant");
        
        json response = {
            {"room_id", room_id},
            {"token", token},
            {"user_id", user_id}
        };
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        resp->setBody(response.dump());
        callback(resp);
        
    } catch (const std::exception& e) {
        LOG_ERROR("Join room error: " + std::string(e.what()));
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k500InternalServerError);
        resp->setBody(json{{"error", e.what()}}.dump());
        callback(resp);
    }
}

// VoiceController implementation
void VoiceController::transcribe(
    const drogon::HttpRequestPtr& req,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    
    try {
        if (!g_voice_proxy || !g_voice_proxy->is_available()) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k503ServiceUnavailable);
            resp->setBody(json{{"error", "Voice service not available"}}.dump());
            callback(resp);
            return;
        }
        
        const auto& files = req->getFiles();
        if (files.empty()) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k400BadRequest);
            resp->setBody(json{{"error", "No audio file provided"}}.dump());
            callback(resp);
            return;
        }
        
        // Read audio file
        const auto& file = files[0];
        std::ifstream ifs(file->fileName(), std::ios::binary);
        std::vector<uint8_t> audio_data(
            (std::istreambuf_iterator<char>(ifs)),
            std::istreambuf_iterator<char>()
        );
        
        // Transcribe asynchronously
        auto future = g_voice_proxy->transcribe_async(audio_data);
        
        // For now, return processing status
        // In production, wait for result or use webhook
        json response = {
            {"status", "processing"},
            {"message", "Transcription in progress"}
        };
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        resp->setBody(response.dump());
        callback(resp);
        
    } catch (const std::exception& e) {
        LOG_ERROR("Transcribe error: " + std::string(e.what()));
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        resp->setBody(json{{"error", "Invalid audio file"}}.dump());
        callback(resp);
    }
}

void VoiceController::synthesize(
    const drogon::HttpRequestPtr& req,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    
    try {
        if (!g_voice_proxy || !g_voice_proxy->is_available()) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k503ServiceUnavailable);
            resp->setBody(json{{"error", "Voice service not available"}}.dump());
            callback(resp);
            return;
        }
        
        json body = json::parse(req->body());
        if (!body.contains("text")) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k400BadRequest);
            resp->setBody(json{{"error", "Text is required"}}.dump());
            callback(resp);
            return;
        }
        
        std::string text = body["text"].get<std::string>();
        std::string voice = body.value("voice", "default");
        
        // Synthesize asynchronously
        auto future = g_voice_proxy->synthesize_async(text, voice);
        
        // For now, return processing status
        json response = {
            {"status", "processing"},
            {"message", "Synthesis in progress"}
        };
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        resp->setBody(response.dump());
        callback(resp);
        
    } catch (const std::exception& e) {
        LOG_ERROR("Synthesize error: " + std::string(e.what()));
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        resp->setBody(json{{"error", "Invalid request"}}.dump());
        callback(resp);
    }
}

void VoiceController::stream(
    const drogon::HttpRequestPtr& req,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    
    // Streaming endpoint for real-time transcription
    // In production, use WebSocket for bidirectional streaming
    
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setStatusCode(drogon::k501NotImplemented);
    resp->setBody(json{{"error", "Streaming not yet implemented"}}.dump());
    callback(resp);
}

// AuthController implementation
void AuthController::verify(
    const drogon::HttpRequestPtr& req,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    
    try {
        json body = json::parse(req->body());
        std::string token = body.value("token", "");
        
        if (token.empty()) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k400BadRequest);
            resp->setBody(json{{"error", "Token is required"}}.dump());
            callback(resp);
            return;
        }
        
        auto [result, payload] = JwtUtils::validate_token(token);
        
        if (result != JwtValidationResult::Valid) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k401Unauthorized);
            resp->setBody(json{
                {"error", "Invalid token"},
                {"reason", JwtUtils::validation_result_to_string(result)}
            }.dump());
            callback(resp);
            return;
        }
        
        json response = {
            {"valid", true},
            {"payload", payload->to_json()}
        };
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        resp->setBody(response.dump());
        callback(resp);
        
    } catch (const std::exception& e) {
        LOG_ERROR("Auth verify error: " + std::string(e.what()));
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k500InternalServerError);
        resp->setBody(json{{"error", e.what()}}.dump());
        callback(resp);
    }
}

void AuthController::refresh(
    const drogon::HttpRequestPtr& req,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    
    try {
        json body = json::parse(req->body());
        std::string token = body.value("token", "");
        
        if (token.empty()) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k400BadRequest);
            resp->setBody(json{{"error", "Token is required"}}.dump());
            callback(resp);
            return;
        }
        
        std::string new_token = JwtUtils::refresh_token(token);
        
        json response = {
            {"token", new_token}
        };
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        resp->setBody(response.dump());
        callback(resp);
        
    } catch (const std::exception& e) {
        LOG_ERROR("Auth refresh error: " + std::string(e.what()));
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k401Unauthorized);
        resp->setBody(json{{"error", "Cannot refresh token"}}.dump());
        callback(resp);
    }
}

} // namespace vidor
