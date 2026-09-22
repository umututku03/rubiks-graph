# Rubik's Cube Graph Solver

An exact 2x2 Rubik's Cube solver built around the cube's state graph. Each legal cube configuration is a vertex, each face turn is an edge, and bidirectional breadth-first search finds a shortest path to the solved state.

The 2x2 cube has 3,674,160 reachable states, making exact graph search practical. The same direct search is not practical for the 3x3 cube, whose state graph has roughly 4.3 x 10^19 vertices.

## Build

```sh
cmake -S . -B build
cmake --build build
```

## Use

```sh
./build/rubiks-graph solve "R U R' U'"
```

Moves use standard notation: `U`, `R`, `F`, `D`, `L`, and `B`. Add `2` for a half turn or `'` for a counterclockwise turn.

The result includes the shortest solution and the number of graph vertices and edges examined during the search.
