#include "logger.h"
#include <sstream>
#include <iomanip>
#include <ctime>

namespace vidor {

std::string LogEntry::to_string() const {
    std::ostringstream oss;
    
    // Format timestamp
    auto time_t_val = std::chrono::system_clock::to_time_t(timestamp);
    std::tm tm_val;
#if defined(_WIN32) || defined(_MSC_VER)
    localtime_s(&tm_val, &time_t_val);
#else
    localtime_r(&time_t_val, &tm_val);
#endif
    
    oss << std::put_time(&tm_val, "%Y-%m-%d %H:%M:%S");
    
    // Add milliseconds
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        timestamp.time_since_epoch()
    ).count() % 1000;
    oss << '.' << std::setfill('0') << std::setw(3) << ms;
    
    // Log level
    oss << " [" << log_level_to_string(level) << "]";
    
    // Thread ID
    oss << " [tid:" << std::this_thread::get_id() << "]";
    
    // Logger name
    if (!logger.empty()) {
        oss << " [" << logger << "]";
    }
    
    // Location
    if (!file.empty()) {
        // Extract just the filename
        size_t pos = file.find_last_of("/\\");
        std::string filename = (pos != std::string::npos) ? file.substr(pos + 1) : file;
        oss << " " << filename << ":" << line;
        
        if (!function.empty()) {
            oss << " (" << function << ")";
        }
    }
    
    // Message
    oss << " - " << message;
    
    return oss.str();
}

std::string LogEntry::to_json() const {
    json j = {
        {"level", log_level_to_string(level)},
        {"message", message},
        {"timestamp", std::chrono::system_clock::to_time_t(timestamp)},
        {"thread", std::to_string(std::hash<std::thread::id>{}(thread_id))}
    };
    
    if (!logger.empty()) j["logger"] = logger;
    if (!file.empty()) j["file"] = file;
    if (line > 0) j["line"] = line;
    if (!function.empty()) j["function"] = function;
    
    return j.dump();
}

// Console Logger
ConsoleLogger::ConsoleLogger(LogLevel min_level) : min_level_(min_level) {}

void ConsoleLogger::log(LogLevel level, const std::string& message,
                        const std::string& logger,
                        const std::source_location& location) {
    if (level < min_level_) return;
    
    std::lock_guard<std::mutex> lock(mutex_);
    
    LogEntry entry{
        .level = level,
        .message = message,
        .logger = logger,
        .file = location.file_name(),
        .line = static_cast<int>(location.line()),
        .function = location.function_name(),
        .timestamp = std::chrono::system_clock::now(),
        .thread_id = std::this_thread::get_id()
    };
    
    if (colored_) {
        std::cout << get_color(level) << entry.to_string() << get_reset() << std::endl;
    } else {
        std::cout << entry.to_string() << std::endl;
    }
}

const char* ConsoleLogger::get_color(LogLevel level) const {
    switch (level) {
        case LogLevel::Debug:   return "\033[36m"; // Cyan
        case LogLevel::Info:    return "\033[32m"; // Green
        case LogLevel::Warning: return "\033[33m"; // Yellow
        case LogLevel::Error:   return "\033[31m"; // Red
        case LogLevel::Fatal:   return "\033[35m"; // Magenta
        default:                return "\033[0m";
    }
}

const char* ConsoleLogger::get_reset() const {
    return "\033[0m";
}

// File Logger
FileLogger::FileLogger(const std::string& filename,
                       LogLevel min_level,
                       size_t max_size_bytes,
                       int max_files)
    : filename_(filename)
    , min_level_(min_level)
    , max_size_bytes_(max_size_bytes)
    , max_files_(max_files)
{
    open_file();
}

FileLogger::~FileLogger() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (file_.is_open()) {
        file_.flush();
        file_.close();
    }
}

void FileLogger::log(LogLevel level, const std::string& message,
                     const std::string& logger,
                     const std::source_location& location) {
    if (level < min_level_) return;
    
    std::lock_guard<std::mutex> lock(mutex_);
    
    LogEntry entry{
        .level = level,
        .message = message,
        .logger = logger,
        .file = location.file_name(),
        .line = static_cast<int>(location.line()),
        .function = location.function_name(),
        .timestamp = std::chrono::system_clock::now(),
        .thread_id = std::this_thread::get_id()
    };
    
    if (!file_.is_open()) {
        open_file();
    }
    
    if (file_.is_open()) {
        file_ << entry.to_string() << std::endl;
        current_size_ += entry.to_string().length() + 1; // +1 for newline
        
        rotate_if_needed();
    }
}

void FileLogger::flush() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (file_.is_open()) {
        file_.flush();
    }
}

void FileLogger::rotate_if_needed() {
    if (current_size_ >= max_size_bytes_) {
        rotate();
    }
}

void FileLogger::rotate() {
    if (file_.is_open()) {
        file_.close();
    }
    
    // Delete oldest file
    std::string oldest_file = filename_ + "." + std::to_string(max_files_);
    std::remove(oldest_file.c_str());
    
    // Rotate existing files
    for (int i = max_files_ - 1; i >= 1; --i) {
        std::string old_name = filename_ + "." + std::to_string(i);
        std::string new_name = filename_ + "." + std::to_string(i + 1);
        std::rename(old_name.c_str(), new_name.c_str());
    }
    
    // Rename current file
    if (std::ifstream(filename_)) {
        std::rename(filename_.c_str(), (filename_ + ".1").c_str());
    }
    
    current_size_ = 0;
    open_file();
}

void FileLogger::open_file() {
    file_.open(filename_, std::ios::app);
    if (file_.is_open()) {
        // Get current file size
        file_.seekp(0, std::ios::end);
        current_size_ = static_cast<size_t>(file_.tellp());
    }
}

// Multi Logger
void MultiLogger::add_logger(std::shared_ptr<Logger> logger) {
    std::lock_guard<std::mutex> lock(mutex_);
    loggers_.push_back(logger);
}

void MultiLogger::log(LogLevel level, const std::string& message,
                      const std::string& logger,
                      const std::source_location& location) {
    if (level < min_level_) return;
    
    std::lock_guard<std::mutex> lock(mutex_);
    for (auto& l : loggers_) {
        l->log(level, message, logger, location);
    }
}

void MultiLogger::set_level(LogLevel level) {
    std::lock_guard<std::mutex> lock(mutex_);
    min_level_ = level;
    for (auto& l : loggers_) {
        l->set_level(level);
    }
}

LogLevel MultiLogger::get_level() const {
    return min_level_;
}

// Log Manager
LogManager& LogManager::instance() {
    static LogManager instance;
    return instance;
}

void LogManager::debug(const std::string& message,
                       const std::source_location& location) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (logger_ && level_ <= LogLevel::Debug) {
        logger_->log(LogLevel::Debug, message, "", location);
    }
}

void LogManager::info(const std::string& message,
                      const std::source_location& location) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (logger_ && level_ <= LogLevel::Info) {
        logger_->log(LogLevel::Info, message, "", location);
    }
}

void LogManager::warn(const std::string& message,
                      const std::source_location& location) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (logger_ && level_ <= LogLevel::Warning) {
        logger_->log(LogLevel::Warning, message, "", location);
    }
}

void LogManager::error(const std::string& message,
                       const std::source_location& location) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (logger_ && level_ <= LogLevel::Error) {
        logger_->log(LogLevel::Error, message, "", location);
    }
}

void LogManager::fatal(const std::string& message,
                       const std::source_location& location) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (logger_) {
        logger_->log(LogLevel::Fatal, message, "", location);
    }
}

void LogManager::set_level(LogLevel level) {
    std::lock_guard<std::mutex> lock(mutex_);
    level_ = level;
    if (logger_) {
        logger_->set_level(level);
    }
}

LogLevel LogManager::get_level() const {
    return level_;
}

void LogManager::initialize(const std::string& level_str,
                            const std::string& file,
                            bool console) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto level = log_level_from_string(level_str);
    level_ = level;
    
    auto multi_logger = std::make_shared<MultiLogger>();
    multi_logger->set_level(level);
    
    if (console) {
        auto console_logger = std::make_shared<ConsoleLogger>(level);
        multi_logger->add_logger(console_logger);
    }
    
    if (!file.empty()) {
        auto file_logger = std::make_shared<FileLogger>(file, level);
        multi_logger->add_logger(file_logger);
    }
    
    logger_ = multi_logger;
    
    LOG_INFO("Logger initialized (level=" + level_str + ", file=" + 
             (file.empty() ? "none" : file) + ")");
}

} // namespace vidor
