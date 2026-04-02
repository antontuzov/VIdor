#include "voice_proxy.h"
#include "config.h"
#include "logger.h"
#include <random>
#include <algorithm>
#include <cstring>

namespace vidor {

VoiceProxy::VoiceProxy() {}

VoiceProxy::~VoiceProxy() {
    // Cleanup active sessions
    std::lock_guard<std::mutex> lock(session_mutex_);
    sessions_.clear();
}

bool VoiceProxy::initialize(const std::string& api_key, 
                             const std::string& api_url,
                             const std::string& model,
                             int sample_rate) {
    if (api_key.empty()) {
        last_error_ = "API key is empty";
        LOG_ERROR("VoiceProxy initialization failed: API key is empty");
        return false;
    }
    
    api_key_ = api_key;
    api_url_ = api_url;
    model_ = model;
    sample_rate_ = sample_rate;
    initialized_ = true;
    
    LOG_INFO("VoiceProxy initialized");
    LOG_INFO("  API URL: " + api_url);
    LOG_INFO("  Model: " + model);
    LOG_INFO("  Sample rate: " + std::to_string(sample_rate) + " Hz");
    
    return true;
}

std::string VoiceProxy::generate_session_id() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(0, 15);
    
    const char* hex = "0123456789abcdef";
    std::string result = "session_";
    result.reserve(16);
    
    for (int i = 0; i < 8; ++i) {
        result += hex[dis(gen)];
    }
    
    return result;
}

std::string VoiceProxy::start_transcription_session(
    const std::string& room_id,
    const std::string& participant_id,
    const std::string& language) {
    
    if (!initialized_) {
        LOG_ERROR("VoiceProxy not initialized");
        return "";
    }
    
    std::string session_id = generate_session_id();
    
    auto session = std::make_shared<VoiceSession>();
    session->id = session_id;
    session->room_id = room_id;
    session->participant_id = participant_id;
    session->language = language.empty() ? "en" : language;
    session->is_active = true;
    
    {
        std::lock_guard<std::mutex> lock(session_mutex_);
        sessions_[session_id] = session;
    }
    
    LOG_INFO_CAT("voice", "Transcription session started: " + session_id);
    
    return session_id;
}

void VoiceProxy::send_audio_chunk(const std::string& session_id,
                                   const std::vector<uint8_t>& pcm_data,
                                   int sample_rate,
                                   int bits_per_sample) {
    std::lock_guard<std::mutex> lock(session_mutex_);
    
    auto it = sessions_.find(session_id);
    if (it == sessions_.end()) {
        LOG_WARN_CAT("voice", "Session not found: " + session_id);
        return;
    }
    
    auto& session = it->second;
    session->last_activity = std::chrono::steady_clock::now();
    session->chunk_count++;
    
    if (!initialized_) {
        // In fallback mode, just count chunks
        return;
    }
    
    // Validate chunk size
    // Expected: sample_rate * (bits_per_sample / 8) * (chunk_duration_ms / 1000)
    size_t expected_size = (sample_rate * (bits_per_sample / 8)) / 10; // 100ms
    
    if (pcm_data.empty()) {
        LOG_WARN_CAT("voice", "Empty audio chunk received");
        return;
    }
    
    if (pcm_data.size() < expected_size / 2) {
        LOG_WARN_CAT("voice", "Audio chunk too small: " + 
                     std::to_string(pcm_data.size()) + " bytes");
    }
    
    // In production, send chunk to API via WebSocket
    // For now, we just track the data
}

void VoiceProxy::end_transcription_session(const std::string& session_id) {
    std::lock_guard<std::mutex> lock(session_mutex_);
    
    auto it = sessions_.find(session_id);
    if (it != sessions_.end()) {
        auto& session = it->second;
        session->is_active = false;
        
        LOG_INFO_CAT("voice", "Transcription session ended: " + session_id + 
                     " (chunks: " + std::to_string(session->chunk_count) + ")");
        
        // Session will be cleaned up by cleanup_sessions()
    }
}

void VoiceProxy::set_transcription_callback(TranscriptionCallback callback) {
    transcription_callback_ = callback;
}

std::future<TranscriptionResult> VoiceProxy::transcribe_async(
    const std::vector<uint8_t>& audio_data,
    const std::string& format,
    int sample_rate) {
    
    return std::async(std::launch::async, [this, audio_data, format, sample_rate]() {
        return transcribe(audio_data, format, sample_rate);
    });
}

TranscriptionResult VoiceProxy::transcribe(
    const std::vector<uint8_t>& audio_data,
    const std::string& format,
    int sample_rate) {
    
    if (!initialized_) {
        throw std::runtime_error("VoiceProxy not initialized");
    }
    
    if (audio_data.empty()) {
        throw std::runtime_error("Audio data is empty");
    }
    
    LOG_INFO_CAT("voice", "Transcribing audio: " + 
                 std::to_string(audio_data.size()) + " bytes");
    
    // In production, send to Qwen-Audio API
    // For now, return placeholder result
    
    TranscriptionResult result;
    result.text = "[Transcription would be returned from Qwen-Audio API]";
    result.language = "en";
    result.confidence = 0.95;
    result.is_final = true;
    result.session_id = "";
    result.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
    
    // Add placeholder words
    TranscriptionWord word;
    word.text = "Hello";
    word.start_time = 0.0;
    word.end_time = 0.5;
    word.confidence = 0.98;
    result.words.push_back(word);
    
    word.text = "world";
    word.start_time = 0.5;
    word.end_time = 1.0;
    word.confidence = 0.96;
    result.words.push_back(word);
    
    // Invoke callback if set
    if (transcription_callback_ && !result.session_id.empty()) {
        transcription_callback_(result.session_id, result);
    }
    
    return result;
}

std::future<SynthesisResult> VoiceProxy::synthesize_async(
    const std::string& text,
    const std::string& voice,
    const std::string& format,
    int sample_rate) {
    
    return std::async(std::launch::async, [this, text, voice, format, sample_rate]() {
        return synthesize(text, voice, format, sample_rate);
    });
}

SynthesisResult VoiceProxy::synthesize(
    const std::string& text,
    const std::string& voice,
    const std::string& format,
    int sample_rate) {
    
    if (!initialized_) {
        SynthesisResult result;
        result.error = "VoiceProxy not initialized";
        return result;
    }
    
    if (text.empty()) {
        SynthesisResult result;
        result.error = "Text is empty";
        return result;
    }
    
    LOG_INFO_CAT("voice", "Synthesizing speech: " + 
                 std::to_string(text.length()) + " characters");
    
    // In production, call Qwen TTS API
    // For now, return placeholder result
    
    SynthesisResult result;
    result.format = format.empty() ? "wav" : format;
    result.sample_rate = sample_rate;
    result.channels = 1;
    result.bits_per_sample = 16;
    
    // Generate silent audio as placeholder
    // Approximate duration: 1 second per 15 characters
    double duration = text.length() / 15.0;
    result.duration = duration;
    
    // Generate silence (in production, this would be actual audio)
    size_t audio_size = static_cast<size_t>(
        sample_rate * duration * result.channels * (result.bits_per_sample / 8)
    );
    result.audio_data.resize(audio_size, 0);
    
    return result;
}

std::shared_ptr<VoiceSession> VoiceProxy::get_session(const std::string& session_id) {
    std::lock_guard<std::mutex> lock(session_mutex_);
    
    auto it = sessions_.find(session_id);
    if (it != sessions_.end()) {
        return it->second;
    }
    
    return nullptr;
}

std::vector<std::shared_ptr<VoiceSession>> VoiceProxy::get_room_sessions(
    const std::string& room_id) {
    
    std::lock_guard<std::mutex> lock(session_mutex_);
    
    std::vector<std::shared_ptr<VoiceSession>> result;
    
    for (const auto& [id, session] : sessions_) {
        if (session->room_id == room_id && session->is_active) {
            result.push_back(session);
        }
    }
    
    return result;
}

void VoiceProxy::cleanup_sessions() {
    std::lock_guard<std::mutex> lock(session_mutex_);
    
    auto now = std::chrono::steady_clock::now();
    auto threshold = std::chrono::minutes(30);
    
    for (auto it = sessions_.begin(); it != sessions_.end();) {
        auto& session = it->second;
        
        // Remove inactive sessions or sessions older than threshold
        if (!session->is_active || (now - session->created_at > threshold)) {
            LOG_INFO_CAT("voice", "Cleaning up session: " + session->id);
            it = sessions_.erase(it);
        } else {
            ++it;
        }
    }
}

size_t VoiceProxy::get_session_count() const {
    std::lock_guard<std::mutex> lock(session_mutex_);
    return sessions_.size();
}

json VoiceProxy::build_transcription_request(
    const std::vector<uint8_t>& audio_data,
    const std::string& format,
    int sample_rate) {
    
    return json{
        {"model", model_},
        {"input", {
            {"format", format},
            {"sample_rate", sample_rate},
            {"bits_per_sample", 16},
            {"channels", 1},
            {"data", audio_data}
        }},
        {"parameters", {
            {"language", "en"},
            {"disfluency_removal", true},
            {"punctuation", true}
        }},
        {"streaming", true}
    };
}

json VoiceProxy::build_synthesis_request(
    const std::string& text,
    const std::string& voice,
    const std::string& format,
    int sample_rate) {
    
    return json{
        {"model", model_ + "-tts"},
        {"input", {
            {"text", text}
        }},
        {"parameters", {
            {"voice", voice},
            {"format", format},
            {"sample_rate", sample_rate},
            {"speed", 1.0},
            {"pitch", 1.0},
            {"volume", 1.0}
        }}
    };
}

TranscriptionResult VoiceProxy::parse_transcription_response(const json& response) {
    TranscriptionResult result;
    
    if (response.contains("text")) {
        result.text = response["text"].get<std::string>();
    }
    
    if (response.contains("language")) {
        result.language = response["language"].get<std::string>();
    }
    
    if (response.contains("confidence")) {
        result.confidence = response["confidence"].get<double>();
    }
    
    if (response.contains("words")) {
        for (const auto& word_json : response["words"]) {
            TranscriptionWord word;
            word.text = word_json.value("text", "");
            word.start_time = word_json.value("start", 0.0);
            word.end_time = word_json.value("end", 0.0);
            word.confidence = word_json.value("confidence", 0.0);
            result.words.push_back(word);
        }
    }
    
    result.is_final = response.value("is_final", true);
    result.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
    
    return result;
}

SynthesisResult VoiceProxy::parse_synthesis_response(
    const json& response,
    const std::vector<uint8_t>& raw_data) {
    
    SynthesisResult result;
    
    if (response.contains("format")) {
        result.format = response["format"].get<std::string>();
    }
    
    if (response.contains("sample_rate")) {
        result.sample_rate = response["sample_rate"].get<int>();
    }
    
    if (response.contains("duration")) {
        result.duration = response["duration"].get<double>();
    }
    
    result.audio_data = raw_data;
    result.channels = 1;
    result.bits_per_sample = 16;
    
    return result;
}

void VoiceProxy::cleanup_inactive_sessions() {
    cleanup_sessions();
}

} // namespace vidor
