import { Alg } from "cubing/alg";
import { TwistyPlayer } from "cubing/twisty";
import { StateGraph } from "./graph.js";

const configuration = {
  "2x2x2": {
    title: "2×2 cube",
    stateCount: "3,674,160",
    godsNumber: "11",
    scrambleLength: 10,
    initialScramble: "R U R' F2 U' R2",
  },
  "3x3x3": {
    title: "3×3 cube",
    stateCount: "43,252,003,274,489,856,000",
    godsNumber: "20",
    scrambleLength: 18,
    initialScramble: "R U2 F' L2 D B2 U' R2 F D2 L' B U F2 R' D'",
  },
};

const elements = {
  stage: document.querySelector("#cube-stage"),
  puzzleButtons: [...document.querySelectorAll(".puzzle-option")],
  cubeTitle: document.querySelector("#cube-title"),
  status: document.querySelector(".status"),
  statusText: document.querySelector("#status-text"),
  scrambleInput: document.querySelector("#scramble-input"),
  inputMessage: document.querySelector("#input-message"),
  randomButton: document.querySelector("#random-button"),
  solveButton: document.querySelector("#solve-button"),
  playButton: document.querySelector("#play-button"),
  resetButton: document.querySelector("#reset-button"),
  previousButton: document.querySelector("#previous-button"),
  nextButton: document.querySelector("#next-button"),
  timeline: document.querySelector("#timeline"),
  currentMove: document.querySelector("#current-move"),
  totalMoves: document.querySelector("#total-moves"),
  solutionMoves: document.querySelector("#solution-moves"),
  stateCount: document.querySelector("#state-count"),
  godsNumber: document.querySelector("#gods-number"),
  pathLength: document.querySelector("#path-length"),
  pathCaption: document.querySelector("#path-caption"),
  graphDepth: document.querySelector("#graph-depth"),
};

const graph = new StateGraph(document.querySelector("#graph-canvas"));
let puzzleID = "2x2x2";
let player;
let solutionMoves = [];
let progress = 0;
let playbackTimer;

function leafMoves(alg) {
  return [...alg.experimentalLeafMoves()].map((move) => move.toString());
}

function parseScramble() {
  const value = elements.scrambleInput.value.trim();
  if (!value) {
    throw new Error("Enter at least one face turn.");
  }
  const alg = Alg.fromString(value);
  const moves = leafMoves(alg);
  const invalidMove = moves.find((move) => !/^[URFDLB](2|')?$/.test(move));
  if (invalidMove) {
    throw new Error(`Unsupported move: ${invalidMove}. Use U, R, F, D, L, or B face turns.`);
  }
  if (moves.length > 19) {
    throw new Error("Use at most 19 face turns so the displayed path remains below 20 moves.");
  }
  return alg;
}

function randomScramble(length) {
  const faces = ["U", "R", "F", "D", "L", "B"];
  const suffixes = ["", "2", "'"];
  const moves = [];
  let previousFace = "";
  while (moves.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];
    if (face === previousFace) {
      continue;
    }
    moves.push(face + suffixes[Math.floor(Math.random() * suffixes.length)]);
    previousFace = face;
  }
  return moves.join(" ");
}

function createPlayer(scramble = "", solution = "") {
  player?.remove();
  player = new TwistyPlayer({
    puzzle: puzzleID,
    alg: solution,
    experimentalSetupAlg: scramble,
    background: "none",
    controlPanel: "none",
    hintFacelets: "none",
    tempoScale: 1.15,
  });
  elements.stage.appendChild(player);
  void player.jumpToStart();
}

function setWorking(working, text) {
  elements.status.classList.toggle("working", working);
  elements.statusText.textContent = text;
  elements.solveButton.disabled = working;
  elements.randomButton.disabled = working;
}

function setMessage(message, error = false) {
  elements.inputMessage.textContent = message;
  elements.inputMessage.classList.toggle("error", error);
}

function stopPlayback() {
  window.clearInterval(playbackTimer);
  playbackTimer = undefined;
  elements.playButton.classList.remove("playing");
  player?.pause();
}

function renderMoveChips() {
  elements.solutionMoves.replaceChildren();
  if (!solutionMoves.length) {
    const empty = document.createElement("span");
    empty.className = "empty-move";
    empty.textContent = "Run the solver to reveal the path";
    elements.solutionMoves.appendChild(empty);
    return;
  }

  solutionMoves.forEach((move, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "move-chip";
    button.textContent = move;
    button.dataset.index = index;
    button.addEventListener("click", () => setProgress(index + 1));
    elements.solutionMoves.appendChild(button);
  });
}

function setProgress(nextProgress, updateCube = true) {
  stopPlayback();
  progress = Math.max(0, Math.min(nextProgress, solutionMoves.length));
  elements.currentMove.textContent = progress;
  elements.timeline.value = progress;
  elements.graphDepth.textContent = progress;
  graph.setProgress(progress);

  const chips = [...elements.solutionMoves.querySelectorAll(".move-chip")];
  chips.forEach((chip, index) => {
    chip.classList.toggle("complete", index < progress);
    chip.classList.toggle("active", index === progress - 1);
  });
  chips[Math.max(0, progress - 1)]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

  if (updateCube && player) {
    player.alg = solutionMoves.slice(0, progress).join(" ");
    void player.jumpToEnd({ flash: false });
  }
}

async function solve() {
  stopPlayback();
  try {
    const scramble = parseScramble();
    const scrambleString = scramble.toString();
    setMessage("Building the cube state and solution path.");
    setWorking(true, "Building path");

    solutionMoves = leafMoves(scramble.invert());
    createPlayer(scrambleString, solutionMoves.join(" "));
    graph.setPath(solutionMoves, `${puzzleID}:${scrambleString}`, puzzleID);
    renderMoveChips();

    progress = 0;
    elements.timeline.max = solutionMoves.length;
    elements.timeline.value = 0;
    elements.currentMove.textContent = "0";
    elements.totalMoves.textContent = solutionMoves.length;
    elements.graphDepth.textContent = "0";
    elements.pathLength.textContent = solutionMoves.length;
    elements.pathCaption.textContent = solutionMoves.length === 1 ? "face turn to solved" : "face turns to solved";
    setMessage("Click play, use the arrow controls, or select a move in the path.");
    setWorking(false, "Path found");
  } catch (error) {
    setWorking(false, "Input needs attention");
    setMessage(error instanceof Error ? error.message : "Unable to solve this scramble.", true);
  }
}

function play() {
  if (!solutionMoves.length) {
    void solve();
    return;
  }
  if (playbackTimer) {
    stopPlayback();
    return;
  }
  if (progress >= solutionMoves.length) {
    progress = 0;
  }

  const completed = solutionMoves.slice(0, progress);
  const remaining = solutionMoves.slice(progress);
  const setup = [elements.scrambleInput.value.trim(), ...completed].join(" ");
  createPlayer(setup, remaining.join(" "));
  void player.jumpToStart().then(() => player.play());
  elements.playButton.classList.add("playing");
  const startProgress = progress;
  const startedAt = performance.now();
  const millisecondsPerMove = 860;
  playbackTimer = window.setInterval(() => {
    const elapsedMoves = Math.floor((performance.now() - startedAt) / millisecondsPerMove) + 1;
    progress = Math.min(solutionMoves.length, startProgress + elapsedMoves);
    elements.currentMove.textContent = progress;
    elements.timeline.value = progress;
    elements.graphDepth.textContent = progress;
    graph.setProgress(progress);
    const chips = [...elements.solutionMoves.querySelectorAll(".move-chip")];
    chips.forEach((chip, index) => {
      chip.classList.toggle("complete", index < progress);
      chip.classList.toggle("active", index === progress - 1);
    });
    if (progress >= solutionMoves.length) {
      stopPlayback();
    }
  }, 90);
}

function selectPuzzle(nextPuzzle) {
  stopPlayback();
  puzzleID = nextPuzzle;
  const settings = configuration[puzzleID];
  elements.puzzleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.puzzle === puzzleID);
  });
  elements.cubeTitle.textContent = settings.title;
  elements.stateCount.textContent = settings.stateCount;
  elements.godsNumber.textContent = settings.godsNumber;
  elements.scrambleInput.value = settings.initialScramble;
  elements.pathLength.textContent = "—";
  elements.pathCaption.textContent = "waiting for a solution";
  elements.currentMove.textContent = "0";
  elements.totalMoves.textContent = "0";
  elements.timeline.max = "0";
  elements.graphDepth.textContent = "0";
  solutionMoves = [];
  progress = 0;
  renderMoveChips();
  createPlayer(settings.initialScramble, "");
  graph.setPath([], `${puzzleID}:${settings.initialScramble}`, puzzleID);
  setMessage("Standard face-turn notation, up to 19 moves.");
  setWorking(false, "Ready to solve");
}

elements.puzzleButtons.forEach((button) => {
  button.addEventListener("click", () => selectPuzzle(button.dataset.puzzle));
});
elements.randomButton.addEventListener("click", () => {
  elements.scrambleInput.value = randomScramble(configuration[puzzleID].scrambleLength);
  void solve();
});
elements.solveButton.addEventListener("click", solve);
elements.scrambleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    void solve();
  }
});
elements.playButton.addEventListener("click", play);
elements.resetButton.addEventListener("click", () => setProgress(0));
elements.previousButton.addEventListener("click", () => setProgress(progress - 1));
elements.nextButton.addEventListener("click", () => setProgress(progress + 1));
elements.timeline.addEventListener("input", () => setProgress(Number(elements.timeline.value)));

selectPuzzle("2x2x2");
void solve();
