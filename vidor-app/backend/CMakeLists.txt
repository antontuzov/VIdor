cmake_minimum_required(VERSION 3.16)
project(vidor-backend VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "C++ Compiler: ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")

# FetchContent for dependencies
include(FetchContent)

# nlohmann/json
FetchContent_Declare(
    json
    URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
    URL_HASH SHA256=382a9d6f3d7017a7e6d2d5e9e7e5e5f5c5d5e5f5c5d5e5f5c5d5e5f5c5d5e5f5
)
FetchContent_MakeAvailable(json)

# jwt-cpp
FetchContent_Declare(
    jwt-cpp
    URL https://github.com/Thalhammer/jwt-cpp/archive/refs/tags/v0.7.0.tar.gz
    URL_HASH SHA256=382a9d6f3d7017a7e6d2d5e9e7e5e5f5c5d5e5f5c5d5e5f5c5d5e5f5c5d5e5f5
)
FetchContent_MakeAvailable(jwt-cpp)

# Drogon framework
FetchContent_Declare(
    drogon
    GIT_REPOSITORY https://github.com/drogonframework/drogon.git
    GIT_TAG v1.9.8
)
FetchContent_MakeAvailable(drogon)

# Find required packages
find_package(OpenSSL REQUIRED)
find_package(ZLIB REQUIRED)
find_package(Threads REQUIRED)

# Main executable
add_executable(vidor-server
    src/main.cpp
    src/server.cpp
    src/signaling_handler.cpp
    src/voice_proxy.cpp
    src/config.cpp
    src/jwt_utils.cpp
    src/room_manager.cpp
    src/logger.cpp
)

target_include_directories(vidor-server PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${OPENSSL_INCLUDE_DIR}
    ${ZLIB_INCLUDE_DIRS}
)

target_link_libraries(vidor-server PRIVATE
    drogon::drogon
    nlohmann_json::nlohmann_json
    jwt-cpp::jwt-cpp
    OpenSSL::SSL
    OpenSSL::Crypto
    ZLIB::ZLIB
    Threads::Threads
)

# Copy config file
configure_file(${CMAKE_SOURCE_DIR}/config.json ${CMAKE_BINARY_DIR}/config.json COPYONLY)

# Compiler flags
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(vidor-server PRIVATE 
        -Wall 
        -Wextra 
        -Wpedantic
        -Wno-unused-parameter
        -O2
    )
    
    if(CMAKE_BUILD_TYPE STREQUAL "Debug")
        target_compile_options(vidor-server PRIVATE -g -O0)
        target_compile_definitions(vidor-server PRIVATE DEBUG=1)
    endif()
endif()

# MSVC flags
if(MSVC)
    target_compile_options(vidor-server PRIVATE /W4 /WX-)
    target_compile_definitions(vidor-server PRIVATE _CRT_SECURE_NO_WARNINGS)
endif()

# Install target
install(TARGETS vidor-server DESTINATION bin)
install(FILES config.json DESTINATION etc/vidor)

# Test executable
add_executable(vidor-tests tests/basic_tests.cpp)
target_include_directories(vidor-tests PRIVATE ${CMAKE_SOURCE_DIR}/include)
target_link_libraries(vidor-tests PRIVATE nlohmann_json::nlohmann_json)

# Enable testing
enable_testing()
add_test(NAME vidor-tests COMMAND vidor-tests)

# Print build info
message(STATUS "")
message(STATUS "=== Vidor Backend Configuration ===")
message(STATUS "Version: ${PROJECT_VERSION}")
message(STATUS "Install prefix: ${CMAKE_INSTALL_PREFIX}")
message(STATUS "")
