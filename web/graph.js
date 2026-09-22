const palette = {
  background: "#0d100e",
  line: "#2d332e",
  faint: "#333934",
  start: "#ff8a45",
  path: "#57d8e4",
  goal: "#a5f03b",
  inactive: "#4d534e",
  text: "#d8ddd7",
};

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

export class StateGraph {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.nodes = [];
    this.edges = [];
    this.pathLength = 0;
    this.progress = 0;
    this.frame = 0;
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

  setPath(moves, seedText) {
    this.pathLength = moves.length;
    this.progress = 0;
    this.seed = hashText(seedText);
    this.layout();
    this.revealStartedAt = performance.now();
    cancelAnimationFrame(this.frame);
    const animate = () => {
      this.draw();
      if (performance.now() - this.revealStartedAt < 850) {
        this.frame = requestAnimationFrame(animate);
      }
    };
    animate();
  }

  setProgress(progress) {
    this.progress = Math.max(0, Math.min(progress, this.pathLength));
    this.draw();
  }

  layout() {
    if (!this.width || !this.height) {
      return;
    }

    const random = randomGenerator(this.seed || 19);
    const count = Math.max(this.pathLength + 1, 2);
    const paddingX = Math.min(72, this.width * 0.1);
    const centerY = this.height * 0.52;
    const amplitude = Math.min(86, this.height * 0.19);
    const pathNodes = [];

    for (let index = 0; index < count; ++index) {
      const fraction = index / (count - 1);
      pathNodes.push({
        x: paddingX + fraction * (this.width - paddingX * 2),
        y: centerY + Math.sin(fraction * Math.PI * 2.25 - 0.6) * amplitude,
        type: index === 0 ? "start" : index === count - 1 ? "goal" : "path",
        depth: Math.min(index, this.pathLength),
        label: index,
      });
    }

    const nodes = [...pathNodes];
    const edges = [];
    for (let index = 0; index < pathNodes.length - 1; ++index) {
      edges.push({ from: index, to: index + 1, path: true, depth: index + 1 });
    }

    pathNodes.forEach((parent, pathIndex) => {
      const branchCount = this.pathLength ? 4 + Math.floor(random() * 5) : 7;
      const baseAngle = Math.atan2(
        parent.y - centerY,
        parent.x - this.width / 2,
      );

      for (let branch = 0; branch < branchCount; ++branch) {
        const direction = baseAngle + (random() - 0.5) * 2.8;
        const distance = 32 + random() * 56;
        const first = nodes.length;
        nodes.push({
          x: parent.x + Math.cos(direction) * distance,
          y: parent.y + Math.sin(direction) * distance,
          type: "neighbor",
          depth: pathIndex,
        });
        edges.push({ from: pathIndex, to: first, path: false, depth: pathIndex });

        if (random() > 0.52) {
          const second = nodes.length;
          const bend = direction + (random() - 0.5) * 0.85;
          nodes.push({
            x: nodes[first].x + Math.cos(bend) * (21 + random() * 28),
            y: nodes[first].y + Math.sin(bend) * (21 + random() * 28),
            type: "neighbor",
            depth: pathIndex,
          });
          edges.push({ from: first, to: second, path: false, depth: pathIndex });
        }
      }
    });

    this.nodes = nodes;
    this.edges = edges;
  }

  draw() {
    const context = this.context;
    if (!context || !this.width) {
      return;
    }

    const reveal = this.revealStartedAt
      ? Math.min(1, (performance.now() - this.revealStartedAt) / 700)
      : 1;
    context.clearRect(0, 0, this.width, this.height);
    context.fillStyle = palette.background;
    context.fillRect(0, 0, this.width, this.height);

    context.save();
    context.strokeStyle = "rgba(255,255,255,0.025)";
    context.lineWidth = 1;
    for (let x = 24; x < this.width; x += 36) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, this.height);
      context.stroke();
    }
    for (let y = 24; y < this.height; y += 36) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.width, y);
      context.stroke();
    }
    context.restore();

    context.lineCap = "round";
    for (const edge of this.edges) {
      const from = this.nodes[edge.from];
      const to = this.nodes[edge.to];
      const active = edge.path && edge.depth <= this.progress;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(
        from.x + (to.x - from.x) * reveal,
        from.y + (to.y - from.y) * reveal,
      );
      context.strokeStyle = active ? palette.path : edge.path ? palette.line : "rgba(65,72,66,0.44)";
      context.lineWidth = active ? 2.2 : edge.path ? 1.2 : 0.65;
      context.stroke();
    }

    for (const node of this.nodes) {
      if (node.type === "neighbor") {
        context.beginPath();
        context.arc(node.x, node.y, 1.4 * reveal, 0, Math.PI * 2);
        context.fillStyle = palette.inactive;
        context.fill();
        continue;
      }

      const active = node.type === "start" || node.depth <= this.progress;
      const color = node.type === "start"
        ? palette.start
        : node.type === "goal"
          ? palette.goal
          : active
            ? palette.path
            : palette.inactive;
      const radius = node.type === "start" || node.type === "goal" ? 7 : 4.5;

      if (active) {
        const glow = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, 18);
        glow.addColorStop(0, `${color}55`);
        glow.addColorStop(1, `${color}00`);
        context.beginPath();
        context.arc(node.x, node.y, 18, 0, Math.PI * 2);
        context.fillStyle = glow;
        context.fill();
      }

      context.beginPath();
      context.arc(node.x, node.y, radius * reveal, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = palette.background;
      context.lineWidth = 2;
      context.stroke();
    }

    const current = this.nodes[Math.min(this.progress, this.pathLength)];
    if (current) {
      context.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.fillStyle = palette.text;
      context.textAlign = "center";
      context.fillText(
        this.progress === this.pathLength && this.pathLength > 0 ? "SOLVED" : `d = ${this.progress}`,
        current.x,
        current.y - 18,
      );
    }
  }
}

