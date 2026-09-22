#include "rubiks/cube.hpp"

#include <algorithm>
#include <sstream>
#include <stdexcept>

namespace rubiks {
namespace {

struct QuarterTurn {
    std::array<std::uint8_t, 8> permutation;
    std::array<std::uint8_t, 8> orientation;
};

constexpr std::array<QuarterTurn, 6> turns{{
    {{{3, 0, 1, 2, 4, 5, 6, 7}}, {{0, 0, 0, 0, 0, 0, 0, 0}}},
    {{{4, 1, 2, 0, 7, 5, 6, 3}}, {{2, 0, 0, 1, 1, 0, 0, 2}}},
    {{{1, 5, 2, 3, 0, 4, 6, 7}}, {{1, 2, 0, 0, 2, 1, 0, 0}}},
    {{{0, 1, 2, 3, 5, 6, 7, 4}}, {{0, 0, 0, 0, 0, 0, 0, 0}}},
    {{{0, 2, 6, 3, 4, 1, 5, 7}}, {{0, 1, 2, 0, 0, 2, 1, 0}}},
    {{{0, 1, 3, 7, 4, 5, 2, 6}}, {{0, 0, 1, 2, 0, 0, 2, 1}}},
}};

constexpr std::array<char, 6> face_names{'U', 'R', 'F', 'D', 'L', 'B'};

Face parse_face(char value) {
    const auto found = std::find(face_names.begin(), face_names.end(), value);
    if (found == face_names.end()) {
        throw std::invalid_argument("invalid face: " + std::string(1, value));
    }
    return static_cast<Face>(std::distance(face_names.begin(), found));
}

}

Move Move::inverse() const {
    return Move{face, static_cast<std::uint8_t>(4 - turns)};
}

std::string Move::notation() const {
    std::string result(1, face_names[static_cast<std::size_t>(face)]);
    if (turns == 2) {
        result += '2';
    } else if (turns == 3) {
        result += '\'';
    }
    return result;
}

Cube::Cube()
    : permutation_{0, 1, 2, 3, 4, 5, 6, 7}, orientation_{} {}

Cube Cube::apply(Move move) const {
    if (move.turns < 1 || move.turns > 3) {
        throw std::invalid_argument("turn count must be 1, 2, or 3");
    }

    Cube result = *this;
    for (std::uint8_t count = 0; count < move.turns; ++count) {
        const auto previous = result;
        const auto& turn = turns[static_cast<std::size_t>(move.face)];
        for (std::size_t position = 0; position < 8; ++position) {
            const auto source = turn.permutation[position];
            result.permutation_[position] = previous.permutation_[source];
            result.orientation_[position] = static_cast<std::uint8_t>(
                (previous.orientation_[source] + turn.orientation[position]) % 3
            );
        }
    }
    return result;
}

bool Cube::solved() const {
    return *this == Cube{};
}

const std::array<std::uint8_t, 8>& Cube::permutation() const {
    return permutation_;
}

const std::array<std::uint8_t, 8>& Cube::orientation() const {
    return orientation_;
}

std::size_t CubeHash::operator()(const Cube& cube) const noexcept {
    std::size_t value = 0;
    for (const auto cubie : cube.permutation()) {
        value = value * 8 + cubie;
    }
    for (const auto orientation : cube.orientation()) {
        value = value * 3 + orientation;
    }
    return value;
}

const std::array<Move, 18>& all_moves() {
    static constexpr std::array<Move, 18> moves{{
        {Face::U, 1}, {Face::U, 2}, {Face::U, 3},
        {Face::R, 1}, {Face::R, 2}, {Face::R, 3},
        {Face::F, 1}, {Face::F, 2}, {Face::F, 3},
        {Face::D, 1}, {Face::D, 2}, {Face::D, 3},
        {Face::L, 1}, {Face::L, 2}, {Face::L, 3},
        {Face::B, 1}, {Face::B, 2}, {Face::B, 3},
    }};
    return moves;
}

std::vector<Move> parse_moves(std::string_view input) {
    std::istringstream stream{std::string(input)};
    std::vector<Move> moves;
    std::string token;

    while (stream >> token) {
        if (token.size() > 2 || token.empty()) {
            throw std::invalid_argument("invalid move: " + token);
        }

        std::uint8_t turn_count = 1;
        if (token.size() == 2) {
            if (token[1] == '2') {
                turn_count = 2;
            } else if (token[1] == '\'') {
                turn_count = 3;
            } else {
                throw std::invalid_argument("invalid move: " + token);
            }
        }
        moves.push_back(Move{parse_face(token[0]), turn_count});
    }
    return moves;
}

std::string format_moves(const std::vector<Move>& moves) {
    std::string result;
    for (std::size_t index = 0; index < moves.size(); ++index) {
        if (index != 0) {
            result += ' ';
        }
        result += moves[index].notation();
    }
    return result;
}

Cube apply_moves(Cube cube, const std::vector<Move>& moves) {
    for (const auto move : moves) {
        cube = cube.apply(move);
    }
    return cube;
}

}
