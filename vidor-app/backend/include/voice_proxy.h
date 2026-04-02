#pragma once

#include <string>
#include <vector>
#include <memory>
#include <future>
#include <functional>
#include <nlohmann/json.hpp>
#include <unordered_map>
#include <mutex>
#include <condition_variable>

namespace vidor {

using json = nlohmann::json;

/**
 * Transcription word with timing
 */
struct TranscriptionWord {
    std::string text;
    double start_time; // seconds
    double end_time;   // seconds
    double confidence;
    
    json to_json() const {
        return json{
            {"text", text},
            {"start", start_time},
            {"end", end_time},
            {"confidence", confidence}
        };
    }
};

/**
 * Transcription result
 */
struct TranscriptionResult {
    std::string text;
    std::string language;
    double confidence;
    std::vector<TranscriptionWord> words;
    bool is_final;
    std::string session_id;
    int64_t timestamp;
    
    json to_json() const {
        json words_json = json::array();
        for (const auto& word : words) {
            words_json.push_back(word.to_json());
        }
        
        return json{
            {"text", text},
            {"language", language},
            {"confidence", confidence},
            {"words", words_json},
            {"is_final", is_final},
            {"session_id", session_id},
            {"timestamp", timestamp}
        };
    }
};

/**
 * Text-to-speech synthesis result
 */
struct SynthesisResult {
    std::vector<uint8_t> audio_data;
    std::string format; // "wav", "mp3", "pcm", "ogg"
    int sample_rate;
    int channels;
    int bits_per_sample;
    double duration; // seconds
    std::string error;
    
    bool is_ok() const { return error.empty(); }
};

/**
 * Voice session for streaming transcription
 */
struct VoiceSession {
    std::string id;
    std::string room_id;
    std::string participant_id;
    std::chrono::steady_clock::time_point created_at;
    std::chrono::steady_clock::time_point last_activity;
    int chunk_count = 0;
    std::string language;
    bool is_active = true;
    
    VoiceSession() = default;
    VoiceSession(const std::string& id_, const std::string& room_id_, 
                 const std::string& participant_id_)
        : id(id_), room_id(room_id_), participant_id(participant_id_) 
    {
        created_at = std::chrono::steady_clock::now();
        last_activity = created_at;
    }
};

/**
 * Voice API client for Qwen-Audio/Whisper integration
 */
class VoiceProxy {
public:
    VoiceProxy();
    ~VoiceProxy();
    
    // Initialize with configuration
    bool initialize(const std::string& api_key, const std::string& api_url,
                    const std::string& model, int sample_rate);
    
    // Check if initialized and available
    bool is_available() const { return initialized_; }
    std::string get_error() const { return last_error_; }
    
    // === Streaming Transcription (WebSocket) ===
    
    // Start a new transcription session
    std::string start_transcription_session(
        const std::string& room_id,
        const std::string& participant_id,
        const std::string& language = "en"
    );
    
    // Send audio chunk for transcription
    void send_audio_chunk(
        const std::string& session_id,
        const std::vector<uint8_t>& pcm_data,
        int sample_rate = 16000,
        int bits_per_sample = 16
    );
    
    // End transcription session
    void end_transcription_session(const std::string& session_id);
    
    // Set callback for transcription updates
    using TranscriptionCallback = std::function<void(const std::string& session_id, 
                                                      const TranscriptionResult& result)>;
    void set_transcription_callback(TranscriptionCallback callback);
    
    // === REST API Transcription (File-based) ===
    
    // Transcribe audio file asynchronously
    std::future<TranscriptionResult> transcribe_async(
        const std::vector<uint8_t>& audio_data,
        const std::string& format = "pcm",
        int sample_rate = 16000
    );
    
    // Transcribe audio file (blocking)
    TranscriptionResult transcribe(
        const std::vector<uint8_t>& audio_data,
        const std::string& format = "pcm",
        int sample_rate = 16000
    );
    
    // === Text-to-Speech Synthesis ===
    
    // Synthesize speech asynchronously
    std::future<SynthesisResult> synthesize_async(
        const std::string& text,
        const std::string& voice = "default",
        const std::string& format = "wav",
        int sample_rate = 22050
    );
    
    // Synthesize speech (blocking)
    SynthesisResult synthesize(
        const std::string& text,
        const std::string& voice = "default",
        const std::string& format = "wav",
        int sample_rate = 22050
    );
    
    // === Session Management ===
    
    // Get active session
    std::shared_ptr<VoiceSession> get_session(const std::string& session_id);
    
    // Get all active sessions for a room
    std::vector<std::shared_ptr<VoiceSession>> get_room_sessions(const std::string& room_id);
    
    // Cleanup inactive sessions
    void cleanup_sessions();
    
    // Get session count
    size_t get_session_count() const;
    
private:
    // Internal methods
    json build_transcription_request(const std::vector<uint8_t>& audio_data,
                                      const std::string& format, int sample_rate);
    json build_synthesis_request(const std::string& text, const std::string& voice,
                                  const std::string& format, int sample_rate);
    
    TranscriptionResult parse_transcription_response(const json& response);
    SynthesisResult parse_synthesis_response(const json& response, 
                                              const std::vector<uint8_t>& raw_data);
    
    std::string generate_session_id();
    void cleanup_inactive_sessions();
    
    // Configuration
    std::string api_key_;
    std::string api_url_;
    std::string model_;
    int sample_rate_ = 16000;
    bool initialized_ = false;
    std::string last_error_;
    
    // Session management
    mutable std::mutex session_mutex_;
    std::unordered_map<std::string, std::shared_ptr<VoiceSession>> sessions_;
    
    // Callbacks
    TranscriptionCallback transcription_callback_;
    
    // HTTP client state (simplified - use drogon's HTTP client in production)
    std::string user_agent_ = "Vidor-Backend/1.0";
    int request_timeout_ms_ = 30000;
    int max_retries_ = 3;
};

} // namespace vidor
