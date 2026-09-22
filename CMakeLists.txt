cmake_minimum_required(VERSION 3.20)
project(rubiks_graph VERSION 1.0.0 LANGUAGES CXX)

add_library(rubiks_graph_lib
    src/cube.cpp
    src/solver.cpp
)

target_include_directories(rubiks_graph_lib PUBLIC include)
target_compile_features(rubiks_graph_lib PUBLIC cxx_std_20)

add_executable(rubiks-graph src/main.cpp)
target_link_libraries(rubiks-graph PRIVATE rubiks_graph_lib)

