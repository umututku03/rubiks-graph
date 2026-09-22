#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

namespace rubiks {

enum class Face : std::uint8_t { U, R, F, D, L, B };

struct Move {
    Face face;
    std::uint8_t turns;

    [[nodiscard]] Move inverse() const;
    [[nodiscard]] std::string notation() const;

    auto operator<=>(const Move&) const = default;
};

class Cube {
public:
    Cube();

    [[nodiscard]] Cube apply(Move move) const;
    [[nodiscard]] bool solved() const;
    [[nodiscard]] const std::array<std::uint8_t, 8>& permutation() const;
    [[nodiscard]] const std::array<std::uint8_t, 8>& orientation() const;

    auto operator<=>(const Cube&) const = default;

private:
    std::array<std::uint8_t, 8> permutation_;
    std::array<std::uint8_t, 8> orientation_;
};

struct CubeHash {
    [[nodiscard]] std::size_t operator()(const Cube& cube) const noexcept;
};

[[nodiscard]] const std::array<Move, 18>& all_moves();
[[nodiscard]] std::vector<Move> parse_moves(std::string_view input);
[[nodiscard]] std::string format_moves(const std::vector<Move>& moves);
[[nodiscard]] Cube apply_moves(Cube cube, const std::vector<Move>& moves);

}

