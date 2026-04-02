#pragma once

#include <drogon/drogon.h>
#include <drogon/HttpController.h>
#include <drogon/HttpSimpleController.h>
#include <drogon/WebSocketConnection.h>
#include <memory>
#include <string>

namespace vidor {

/**
 * Main server class - initializes and runs the Drogon application
 */
class VidorServer {
public:
    VidorServer();
    ~VidorServer();
    
    // Initialize server with configuration
    bool initialize();
    
    // Start the server (blocking)
    void start();
    
    // Graceful shutdown
    void shutdown();
    
    // Check if server is running
    bool is_running() const { return running_; }
    
private:
    void setup_routes();
    void setup_cors();
    void setup_websocket();
    void setup_logging();
    void setup_middlewares();
    void setup_static_files();
    
    std::unique_ptr<drogon::HttpAppFramework> app_;
    bool running_ = false;
    bool initialized_ = false;
};

/**
 * Health check endpoint
 * GET /api/health
 */
class HealthController : public drogon::HttpSimpleController<HealthController> {
public:
    void async_handle_http(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback
    ) override;
    
    METHOD_LIST_BEGIN
    METHOD_ADD(HealthController::async_handle_http, "/api/health", Get);
    METHOD_LIST_END
};

/**
 * Room management endpoints
 * POST /api/rooms - Create room
 * GET /api/rooms/:id - Get room info
 * DELETE /api/rooms/:id - Delete room
 */
class RoomController : public drogon::HttpController<RoomController> {
public:
    void createRoom(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback
    );
    
    void getRoomInfo(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
        const std::string& room_id
    );
    
    void deleteRoom(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
        const std::string& room_id
    );
    
    void joinRoom(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
        const std::string& room_id
    );
    
    METHOD_LIST_BEGIN
    METHOD_ADD(RoomController::createRoom, "/api/rooms", Post);
    METHOD_ADD(RoomController::getRoomInfo, "/api/rooms/{1}", Get);
    METHOD_ADD(RoomController::deleteRoom, "/api/rooms/{1}", Delete);
    METHOD_ADD(RoomController::joinRoom, "/api/rooms/{1}/join", Post);
    METHOD_LIST_END
};

/**
 * Voice API proxy endpoints
 * POST /api/voice/transcribe - Transcribe audio
 * POST /api/voice/synthesize - Text-to-speech
 * WS /api/voice/stream - Streaming transcription
 */
class VoiceController : public drogon::HttpController<VoiceController> {
public:
    void transcribe(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback
    );
    
    void synthesize(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback
    );
    
    void stream(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback
    );
    
    METHOD_LIST_BEGIN
    METHOD_ADD(VoiceController::transcribe, "/api/voice/transcribe", Post);
    METHOD_ADD(VoiceController::synthesize, "/api/voice/synthesize", Post);
    METHOD_ADD(VoiceController::stream, "/api/voice/stream", Post);
    METHOD_LIST_END
};

/**
 * Authentication endpoints
 * POST /api/auth/verify - Verify JWT token
 * POST /api/auth/refresh - Refresh JWT token
 */
class AuthController : public drogon::HttpController<AuthController> {
public:
    void verify(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback
    );
    
    void refresh(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback
    );
    
    METHOD_LIST_BEGIN
    METHOD_ADD(AuthController::verify, "/api/auth/verify", Post);
    METHOD_ADD(AuthController::refresh, "/api/auth/refresh", Post);
    METHOD_LIST_END
};

} // namespace vidor
