#pragma once

#include <string>
#include <string_view>
#include <source_location>
#include <chrono>
#include <fstream>
#include <mutex>
#include <atomic>

namespace vidor {

/**
 * Log levels
 */
enum class LogLevel {
    Debug = 0,
    Info = 1,
    Warning = 2,
    Error = 3,
    Fatal = 4
};

/**
 * Convert log level to string
 */
constexpr const char* log_level_to_string(LogLevel level) {
    switch (level) {
        case LogLevel::Debug:   return "DEBUG";
        case LogLevel::Info:    return "INFO";
        case LogLevel::Warning: return "WARN";
        case LogLevel::Error:   return "ERROR";
        case LogLevel::Fatal:   return "FATAL";
        default:                return "UNKNOWN";
    }
}

/**
 * Parse log level from string
 */
inline LogLevel log_level_from_string(const std::string& s) {
    if (s == "debug" || s == "DEBUG") return LogLevel::Debug;
    if (s == "info" || s == "INFO") return LogLevel::Info;
    if (s == "warn" || s == "warning" || s == "WARN" || s == "WARNING") return LogLevel::Warning;
    if (s == "error" || s == "ERROR") return LogLevel::Error;
    if (s == "fatal" || s == "FATAL") return LogLevel::Fatal;
    return LogLevel::Info; // Default
}

/**
 * Log entry
 */
struct LogEntry {
    LogLevel level;
    std::string message;
    std::string logger;
    std::string file;
    int line;
    std::string function;
    std::chrono::system_clock::time_point timestamp;
    std::thread::id thread_id;
    
    std::string to_string() const;
    std::string to_json() const;
};

/**
 * Logger interface
 */
class Logger {
public:
    virtual ~Logger() = default;
    
    virtual void log(LogLevel level, const std::string& message,
                     const std::string& logger = "",
                     const std::source_location& location = std::source_location::current()) = 0;
    
    virtual void set_level(LogLevel level) = 0;
    virtual LogLevel get_level() const = 0;
};

/**
 * Console logger
 */
class ConsoleLogger : public Logger {
public:
    ConsoleLogger(LogLevel min_level = LogLevel::Info);
    
    void log(LogLevel level, const std::string& message,
             const std::string& logger = "",
             const std::source_location& location = std::source_location::current()) override;
    
    void set_level(LogLevel level) override { min_level_ = level; }
    LogLevel get_level() const override { return min_level_; }
    
    void set_colored(bool colored) { colored_ = colored; }
    
private:
    LogLevel min_level_;
    bool colored_ = true;
    std::mutex mutex_;
    
    const char* get_color(LogLevel level) const;
    const char* get_reset() const;
};

/**
 * File logger with rotation
 */
class FileLogger : public Logger {
public:
    FileLogger(const std::string& filename, 
               LogLevel min_level = LogLevel::Info,
               size_t max_size_bytes = 100 * 1024 * 1024, // 100MB
               int max_files = 5);
    
    ~FileLogger();
    
    void log(LogLevel level, const std::string& message,
             const std::string& logger = "",
             const std::source_location& location = std::source_location::current()) override;
    
    void set_level(LogLevel level) override { min_level_ = level; }
    LogLevel get_level() const override { return min_level_; }
    
    void flush();
    
private:
    void rotate_if_needed();
    void rotate();
    void open_file();
    
    std::string filename_;
    LogLevel min_level_;
    size_t max_size_bytes_;
    int max_files_;
    size_t current_size_ = 0;
    std::ofstream file_;
    std::mutex mutex_;
};

/**
 * Multi logger - sends logs to multiple destinations
 */
class MultiLogger : public Logger {
public:
    void add_logger(std::shared_ptr<Logger> logger);
    
    void log(LogLevel level, const std::string& message,
             const std::string& logger = "",
             const std::source_location& location = std::source_location::current()) override;
    
    void set_level(LogLevel level) override;
    LogLevel get_level() const override;
    
private:
    std::vector<std::shared_ptr<Logger>> loggers_;
    LogLevel min_level_ = LogLevel::Info;
    std::mutex mutex_;
};

/**
 * Global logger singleton
 */
class LogManager {
public:
    static LogManager& instance();
    
    // Get the global logger
    std::shared_ptr<Logger> get_logger() const { return logger_; }
    
    // Set the global logger
    void set_logger(std::shared_ptr<Logger> logger) { logger_ = logger; }
    
    // Convenience methods
    void debug(const std::string& message,
               const std::source_location& location = std::source_location::current());
    void info(const std::string& message,
              const std::source_location& location = std::source_location::current());
    void warn(const std::string& message,
              const std::source_location& location = std::source_location::current());
    void error(const std::string& message,
               const std::source_location& location = std::source_location::current());
    void fatal(const std::string& message,
               const std::source_location& location = std::source_location::current());
    
    // Set global log level
    void set_level(LogLevel level);
    LogLevel get_level() const;
    
    // Initialize default logger
    void initialize(const std::string& level = "info", 
                    const std::string& file = "",
                    bool console = true);
    
private:
    LogManager() = default;
    ~LogManager() = default;
    LogManager(const LogManager&) = delete;
    LogManager& operator=(const LogManager&) = delete;
    
    std::shared_ptr<Logger> logger_;
    LogLevel level_ = LogLevel::Info;
    std::mutex mutex_;
};

// Global logging macros
#define LOG_DEBUG(msg) ::vidor::LogManager::instance().debug(msg, std::source_location::current())
#define LOG_INFO(msg) ::vidor::LogManager::instance().info(msg, std::source_location::current())
#define LOG_WARN(msg) ::vidor::LogManager::instance().warn(msg, std::source_location::current())
#define LOG_ERROR(msg) ::vidor::LogManager::instance().error(msg, std::source_location::current())
#define LOG_FATAL(msg) ::vidor::LogManager::instance().fatal(msg, std::source_location::current())

// Logger with category
#define LOG_DEBUG_CAT(cat, msg) \
    ::vidor::LogManager::instance().get_logger()->log( \
        ::vidor::LogLevel::Debug, msg, cat, std::source_location::current())
#define LOG_INFO_CAT(cat, msg) \
    ::vidor::LogManager::instance().get_logger()->log( \
        ::vidor::LogLevel::Info, msg, cat, std::source_location::current())
#define LOG_WARN_CAT(cat, msg) \
    ::vidor::LogManager::instance().get_logger()->log( \
        ::vidor::LogLevel::Warning, msg, cat, std::source_location::current())
#define LOG_ERROR_CAT(cat, msg) \
    ::vidor::LogManager::instance().get_logger()->log( \
        ::vidor::LogLevel::Error, msg, cat, std::source_location::current())

} // namespace vidor
