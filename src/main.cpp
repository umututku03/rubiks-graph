#include "rubiks/cube.hpp"
#include "rubiks/solver.hpp"

#include <exception>
#include <iostream>
#include <string>

namespace {

std::string join_arguments(int argc, char** argv, int start) {
    std::string result;
    for (int index = start; index < argc; ++index) {
        if (!result.empty()) {
            result += ' ';
        }
        result += argv[index];
    }
    return result;
}

void print_usage(const char* program) {
    std::cerr << "Usage: " << program << " solve \"R U R' U'\"\n";
}

}

int main(int argc, char** argv) {
    if (argc < 3 || std::string(argv[1]) != "solve") {
        print_usage(argv[0]);
        return 1;
    }

    try {
        const auto scramble = rubiks::parse_moves(join_arguments(argc, argv, 2));
        const auto state = rubiks::apply_moves(rubiks::Cube{}, scramble);
        const auto solution = rubiks::shortest_solution(state);

        std::cout << "Scramble: " << rubiks::format_moves(scramble) << '\n';
        std::cout << "Solution: "
                  << (solution.moves.empty() ? "already solved" : rubiks::format_moves(solution.moves))
                  << '\n';
        std::cout << "Length: " << solution.moves.size() << '\n';
        std::cout << "Visited vertices: " << solution.stats.visited_vertices << '\n';
        std::cout << "Examined edges: " << solution.stats.examined_edges << '\n';
        std::cout << "Peak frontier: " << solution.stats.peak_frontier << '\n';
    } catch (const std::exception& error) {
        std::cerr << "Error: " << error.what() << '\n';
        return 1;
    }
}

