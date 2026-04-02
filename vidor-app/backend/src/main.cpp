#include "server.h"
#include "config.h"
#include "logger.h"
#include <iostream>
#include <csignal>
#include <atomic>
#include <thread>

namespace {
    std::atomic<bool> g_running{true};
    vidor::VidorServer* g_server = nullptr;
    
    void signal_handler(int signum) {
        std::cout << "\nReceived signal " << signum << ", shutting down..." << std::endl;
        g_running = false;
        
        if (g_server) {
            g_server->shutdown();
        }
    }
    
    void print_banner() {
        std::cout << R"(
 ____   ____  _       _   
|  | \  /    || |     | |  
|  |  ||  o  || |     | |  
|  |  ||     || |___  | |___
|  |  ||  _  ||     | |     |
|  |  ||  |  ||     | |     |
|__|__||__|__||_____| |_____|
                            
)" << std::endl;
        std::cout << "Vidor Signaling Server v1.0.0" << std::endl;
        std::cout << "Crystal-Clear Conferencing, AI-Powered" << std::endl;
        std::cout << "========================================" << std::endl;
    }
}

int main(int argc, char* argv[]) {
    print_banner();
    
    // Load configuration
    auto& config = vidor::Config::instance();
    std::string config_path = "config.json";
    
    // Check for config file argument
    if (argc > 1) {
        config_path = argv[1];
    }
    
    // Also check environment variable
    const char* env_config = std::getenv("VIDOR_CONFIG");
    if (env_config != nullptr) {
        config_path = env_config;
    }
    
    std::cout << "Loading configuration from: " << config_path << std::endl;
    
    if (!config.load(config_path)) {
        std::cerr << "Failed to load configuration from " << config_path << std::endl;
        std::cerr << "You can specify a config file with:" << std::endl;
        std::cerr << "  1. Command line argument: ./vidor-server /path/to/config.json" << std::endl;
        std::cerr << "  2. Environment variable: VIDOR_CONFIG=/path/to/config.json" << std::endl;
        return 1;
    }
    
    // Validate configuration
    if (!config.validate()) {
        std::cerr << "Configuration validation failed: " << config.get_validation_error() << std::endl;
        return 1;
    }
    
    // Setup signal handlers
    g_server = new vidor::VidorServer();
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);
    
#ifndef _WIN32
    std::signal(SIGHUP, signal_handler);
#endif
    
    try {
        if (!g_server->initialize()) {
            std::cerr << "Failed to initialize server" << std::endl;
            delete g_server;
            return 1;
        }
        
        std::cout << "\nServer Configuration:" << std::endl;
        std::cout << "  Host: " << config.server().host << std::endl;
        std::cout << "  Port: " << config.server().port() << std::endl;
        std::cout << "  Threads: " << config.server().threads << std::endl;
        std::cout << "  WebSocket: /ws/signaling" << std::endl;
        std::cout << "  REST API: /api/*" << std::endl;
        
        if (config.server().use_ssl) {
            std::cout << "  SSL: Enabled" << std::endl;
        }
        
        std::cout << "\nPress Ctrl+C to stop the server" << std::endl;
        std::cout << "========================================\n" << std::endl;
        
        // Start server in a separate thread so we can monitor g_running
        std::thread server_thread([&]() {
            g_server->start();
        });
        
        // Wait for shutdown signal
        while (g_running) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        
        // Give server time to shutdown gracefully
        if (server_thread.joinable()) {
            server_thread.join();
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Server error: " << e.what() << std::endl;
        delete g_server;
        return 1;
    }
    
    delete g_server;
    g_server = nullptr;
    
    std::cout << "\nServer stopped." << std::endl;
    return 0;
}
