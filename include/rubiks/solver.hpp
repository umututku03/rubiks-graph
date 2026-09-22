#pragma once

#include "rubiks/cube.hpp"

#include <cstddef>
#include <vector>

namespace rubiks {

struct SearchStats {
    std::size_t visited_vertices{};
    std::size_t examined_edges{};
    std::size_t peak_frontier{};
};

struct Solution {
    std::vector<Move> moves;
    SearchStats stats;
};

[[nodiscard]] Solution shortest_solution(const Cube& start);

}

