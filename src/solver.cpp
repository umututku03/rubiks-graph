#include "rubiks/solver.hpp"

#include <algorithm>
#include <optional>
#include <stdexcept>
#include <unordered_map>

namespace rubiks {
namespace {

struct Link {
    std::optional<Cube> parent;
    std::optional<Move> step_to_parent;
    std::size_t depth{};
};

using SearchTree = std::unordered_map<Cube, Link, CubeHash>;

std::vector<Move> path_to_root(const Cube& start, const SearchTree& tree) {
    std::vector<Move> path;
    Cube current = start;

    while (true) {
        const auto& link = tree.at(current);
        if (!link.parent) {
            break;
        }
        path.push_back(*link.step_to_parent);
        current = *link.parent;
    }
    return path;
}

std::vector<Move> join_paths(
    const Cube& meeting,
    const SearchTree& from_start,
    const SearchTree& from_goal
) {
    auto toward_start = path_to_root(meeting, from_start);
    std::vector<Move> result;
    result.reserve(toward_start.size());

    for (auto iterator = toward_start.rbegin(); iterator != toward_start.rend(); ++iterator) {
        result.push_back(iterator->inverse());
    }

    auto toward_goal = path_to_root(meeting, from_goal);
    result.insert(result.end(), toward_goal.begin(), toward_goal.end());
    return result;
}

std::optional<Cube> expand_layer(
    std::vector<Cube>& frontier,
    SearchTree& own_tree,
    const SearchTree& other_tree,
    SearchStats& stats
) {
    std::vector<Cube> next;
    next.reserve(frontier.size() * 8);
    std::optional<Cube> best_meeting;
    auto best_distance = static_cast<std::size_t>(-1);

    for (const auto& state : frontier) {
        const auto next_depth = own_tree.at(state).depth + 1;
        for (const auto move : all_moves()) {
            ++stats.examined_edges;
            const auto neighbor = state.apply(move);
            if (own_tree.contains(neighbor)) {
                continue;
            }

            own_tree.emplace(neighbor, Link{state, move.inverse(), next_depth});
            if (const auto found = other_tree.find(neighbor); found != other_tree.end()) {
                const auto distance = next_depth + found->second.depth;
                if (distance < best_distance) {
                    best_distance = distance;
                    best_meeting = neighbor;
                }
            }
            next.push_back(neighbor);
        }
    }

    frontier = std::move(next);
    stats.peak_frontier = std::max(stats.peak_frontier, frontier.size());
    return best_meeting;
}

}

Solution shortest_solution(const Cube& start) {
    const Cube goal;
    if (start == goal) {
        return Solution{{}, SearchStats{1, 0, 1}};
    }

    SearchTree from_start;
    SearchTree from_goal;
    from_start.emplace(start, Link{});
    from_goal.emplace(goal, Link{});

    std::vector<Cube> start_frontier{start};
    std::vector<Cube> goal_frontier{goal};
    SearchStats stats{2, 0, 2};

    bool expand_from_start = true;
    while (!start_frontier.empty() && !goal_frontier.empty()) {
        std::optional<Cube> meeting;
        if (expand_from_start) {
            meeting = expand_layer(start_frontier, from_start, from_goal, stats);
        } else {
            meeting = expand_layer(goal_frontier, from_goal, from_start, stats);
        }
        expand_from_start = !expand_from_start;

        stats.visited_vertices = from_start.size() + from_goal.size();
        stats.peak_frontier = std::max(
            stats.peak_frontier,
            start_frontier.size() + goal_frontier.size()
        );
        if (meeting) {
            --stats.visited_vertices;
            return Solution{join_paths(*meeting, from_start, from_goal), stats};
        }
    }

    throw std::runtime_error("the solved state is unreachable");
}

}
