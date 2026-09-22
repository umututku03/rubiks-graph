const colors = ["#ef4b35", "#f3982e", "#f6bd42", "#2f7458", "#285ba7", "#f9f8f1"];
const outline = "#383936";
const guide = "#aaa8a0";

function hashText(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomGenerator(seed) {
  let value = seed || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; --index) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export class StateGraph {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.nodes = [];
    this.progress = 0;
    this.displayProgress = 0;
    this.pathLength = 0;
    this.puzzleID = "2x2x2";
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    this.canvas.width = Math.round(bounds.width * ratio);
    this.canvas.height = Math.round(bounds.height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.layout();
    this.draw();
  }

  setPath(moves, seedText, puzzleID = "2x2x2") {
    this.pathLength = moves.length;
    this.progress = 0;
    this.displayProgress = 0;
    this.seed = hashText(seedText);
    this.puzzleID = puzzleID;
    this.layout();
    this.draw();
  }

  setProgress(progress) {
    this.progress = Math.max(0, Math.min(progress, this.pathLength));
    cancelAnimationFrame(this.frame);
    const animate = () => {
      const distance = this.progress - this.displayProgress;
      this.displayProgress += distance * 0.14;
      if (Math.abs(distance) < 0.01) {
        this.displayProgress = this.progress;
      }
      this.draw();
      if (this.displayProgress !== this.progress) {
        this.frame = requestAnimationFrame(animate);
      }
    };
    animate();
  }

  layout() {
    if (!this.width || !this.height) {
      return;
    }

    const random = randomGenerator(this.seed || 7);
    const size = Math.min(this.width, this.height);
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const clusterRadius = size * 0.235;
    const perFace = this.puzzleID === "3x3x3" ? 9 : 4;
    const dimension = Math.sqrt(perFace);
    const gap = this.puzzleID === "3x3x3" ? size * 0.04 : size * 0.052;
    const angles = [210, 30, 270, 150, 330, 90].map((degrees) => degrees * Math.PI / 180);
    const goalSlots = [];

    for (let face = 0; face < 6; ++face) {
      const clusterX = centerX + Math.cos(angles[face]) * clusterRadius;
      const clusterY = centerY + Math.sin(angles[face]) * clusterRadius;
      for (let index = 0; index < perFace; ++index) {
        const column = index % dimension;
        const row = Math.floor(index / dimension);
        goalSlots.push({
          face,
          x: clusterX + (column - (dimension - 1) / 2) * gap,
          y: clusterY + (row - (dimension - 1) / 2) * gap,
        });
      }
    }

    const starts = shuffled(goalSlots.map((slot) => ({ x: slot.x, y: slot.y })), random);
    this.nodes = goalSlots.map((goal, index) => ({
      color: colors[goal.face],
      startX: starts[index].x + (random() - 0.5) * gap * 0.7,
      startY: starts[index].y + (random() - 0.5) * gap * 0.7,
      goalX: goal.x,
      goalY: goal.y,
    }));
    this.centerX = centerX;
    this.centerY = centerY;
    this.clusterRadius = clusterRadius;
    this.guideRadius = size * 0.32;
    this.angles = angles;
    this.nodeRadius = this.puzzleID === "3x3x3" ? Math.max(6, size * 0.017) : Math.max(8, size * 0.024);
  }

  draw() {
    if (!this.context || !this.width) {
      return;
    }

    const context = this.context;
    const ratio = this.pathLength ? this.displayProgress / this.pathLength : 0;
    const eased = ratio * ratio * (3 - 2 * ratio);
    context.clearRect(0, 0, this.width, this.height);

    context.lineWidth = 2;
    this.angles.forEach((angle, index) => {
      const circleX = this.centerX + Math.cos(angle) * this.clusterRadius * 0.63;
      const circleY = this.centerY + Math.sin(angle) * this.clusterRadius * 0.63;
      context.beginPath();
      context.arc(circleX, circleY, this.guideRadius, 0, Math.PI * 2);
      context.strokeStyle = index / 6 < eased ? outline : guide;
      context.stroke();
    });

    if (this.nodes.length) {
      const ordered = this.nodes.filter((_, index) => index % Math.max(1, Math.floor(this.nodes.length / 14)) === 0);
      context.beginPath();
      ordered.forEach((node, index) => {
        const x = node.startX + (node.goalX - node.startX) * eased;
        const y = node.startY + (node.goalY - node.startY) * eased;
        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
      context.strokeStyle = "rgba(56,57,54,0.28)";
      context.lineWidth = 1.4;
      context.stroke();
    }

    for (const node of this.nodes) {
      const x = node.startX + (node.goalX - node.startX) * eased;
      const y = node.startY + (node.goalY - node.startY) * eased;
      context.beginPath();
      context.arc(x, y, this.nodeRadius, 0, Math.PI * 2);
      context.fillStyle = node.color;
      context.fill();
      context.strokeStyle = outline;
      context.lineWidth = 2;
      context.stroke();
    }
  }
}

