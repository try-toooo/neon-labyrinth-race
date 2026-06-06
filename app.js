// ════════════════════════════════════════════════════════════════
// NEON LABYRINTH — Human vs Agent realtime maze race
// 单文件逻辑：迷宫生成 / A* 寻路 / 玩家碰撞 / Agent 竞速 / 科幻道具
// ════════════════════════════════════════════════════════════════

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {};
[
  "timerText", "playerNodesText", "agentNodesText", "messageText", "statusLabel",
  "scanBtn", "phaseBtn", "jamBtn", "scanText", "phaseText", "jamText",
  "startScreen", "resultScreen", "resultTitle", "resultText", "restartBtn"
].forEach(id => ui[id] = document.getElementById(id));

const COLS = 23;
const ROWS = 27;
const NODE_COUNT = 3;

const DIRS = {
  n: { dx: 0, dy: -1, opp: "s" },
  e: { dx: 1, dy: 0, opp: "w" },
  s: { dx: 0, dy: 1, opp: "n" },
  w: { dx: -1, dy: 0, opp: "e" }
};

const DIFFICULTIES = {
  training: {
    label: "训练官",
    agentName: "MENTOR-1",
    brain: "coach",
    desc: "教练型 Agent：使用基础 A*，但限速且不做前瞻，适合练操作。",
    loopRate: 0.18,
    timeLimit: 190,
    playerSpeed: 3.58,
    agentSpeed: 2.42,
    phase: 1,
    jam: 1,
    scan: 1,
    pickups: 9,
    repath: 0.82
  },
  greedy: {
    label: "贪婪局",
    agentName: "RUSH-5",
    brain: "greedy",
    desc: "贪婪 Agent：只看曼哈顿距离，可能被墙体结构骗。",
    loopRate: 0.15,
    timeLimit: 175,
    playerSpeed: 3.48,
    agentSpeed: 2.66,
    phase: 1,
    jam: 1,
    scan: 1,
    pickups: 9,
    repath: 0.65
  },
  normal: {
    label: "A* 标准局",
    agentName: "VEGA-9",
    brain: "astar",
    desc: "标准 A* Agent：始终按当前最近核心的真实最短路推进。",
    loopRate: 0.12,
    timeLimit: 165,
    playerSpeed: 3.42,
    agentSpeed: 2.86,
    phase: 1,
    jam: 1,
    scan: 1,
    pickups: 9,
    repath: 0.38
  },
  hard: {
    label: "预测局",
    agentName: "NOVA-X",
    brain: "lookahead",
    desc: "前瞻 Agent：会估计核心顺序和出口收益，路线更接近全局最优。",
    loopRate: 0.08,
    timeLimit: 140,
    playerSpeed: 3.32,
    agentSpeed: 3.12,
    phase: 1,
    jam: 1,
    scan: 1,
    pickups: 9,
    repath: 0.28
  }
};

function currentDifficulty() {
  return DIFFICULTIES[state.difficulty] || DIFFICULTIES.normal;
}

const state = {
  mode: "menu",
  difficulty: "normal",
  maze: [],
  layout: { size: 20, ox: 0, oy: 0 },
  time: 0,
  last: 0,
  frame: 0,
  messageTimer: 0,
  winner: null,
  revealTime: 0,
  pulseTime: 0,

  startCell: { x: 0, y: 0 },
  agentStartCell: { x: 0, y: ROWS - 1 },
  exitCell: { x: COLS - 1, y: Math.floor(ROWS / 2) },
  dataNodes: [],
  pickups: [],

  player: {
    x: 0.5, y: 0.5,
    vx: 0, vy: 0,
    speed: 3.35,
    radius: 0.21,
    nodes: new Set(),
    phaseCharges: 2,
    jamCharges: 1,
    scanCharges: 2,
    phaseTime: 0,
    boostTime: 0,
    autoPath: [],
    autoTarget: null,
    navPath: [],
    navTarget: null,
    navTime: 0,
    trail: []
  },

  agent: {
    x: 0.5, y: ROWS - 0.5,
    speed: 2.95,
    brain: "astar",
    nodes: new Set(),
    path: [],
    target: null,
    repath: 0,
    jamTime: 0,
    trail: []
  },

  input: {
    keys: new Set(),
    pad: new Set()
  }
};

// ════════════════════════════════════════════════════════════════
// 初始化与事件
// ════════════════════════════════════════════════════════════════

function boot() {
  bind();
  resize();
  newMatch("normal", false);
  requestAnimationFrame(loop);
}

function bind() {
  window.addEventListener("resize", resize);

  document.querySelectorAll(".start-btn").forEach(btn => {
    btn.addEventListener("click", () => newMatch(btn.dataset.mode || "normal", true));
  });
  ui.restartBtn.addEventListener("click", () => newMatch(state.difficulty, true));

  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    state.input.keys.add(k);
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (state.mode !== "running") return;
    if (k === "q") useScan();
    if (k === "e") useJam();
    if (k === " ") usePhase();
  });
  window.addEventListener("keyup", e => state.input.keys.delete(e.key.toLowerCase()));

  ui.scanBtn.addEventListener("click", useScan);
  ui.phaseBtn.addEventListener("click", usePhase);
  ui.jamBtn.addEventListener("click", useJam);

}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  computeLayout();
}

function computeLayout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const topReserve = Math.min(118, h * 0.16);
  const bottomReserve = Math.min(124, h * 0.18);
  const sideReserve = w < 560 ? 74 : 96;
  const availableW = w - sideReserve - 24;
  const availableH = h - topReserve - bottomReserve;
  const size = Math.floor(Math.min(availableW / COLS, availableH / ROWS));
  state.layout.size = clamp(size, 11, 28);
  state.layout.ox = Math.floor((w - sideReserve - state.layout.size * COLS) / 2);
  state.layout.oy = Math.floor(topReserve + (availableH - state.layout.size * ROWS) / 2);
}

// ════════════════════════════════════════════════════════════════
// 开局
// ════════════════════════════════════════════════════════════════

function newMatch(difficulty = "normal", startRunning = true) {
  state.difficulty = difficulty;
  state.mode = startRunning ? "running" : "menu";
  state.time = 0;
  state.last = 0;
  state.frame = 0;
  state.revealTime = 0;
  state.pulseTime = 0;
  state.winner = null;

  const cfg = currentDifficulty();
  state.maze = generateMaze(COLS, ROWS, cfg.loopRate);
  state.startCell = { x: 0, y: 0 };
  state.agentStartCell = { x: 0, y: ROWS - 1 };
  state.exitCell = { x: COLS - 1, y: Math.floor(ROWS / 2) };
  openExitEdges();
  state.dataNodes = placeDataNodes();
  state.pickups = placePickups(cfg.pickups);

  Object.assign(state.player, {
    x: 0.5, y: 0.5,
    speed: cfg.playerSpeed,
    nodes: new Set(),
    phaseCharges: cfg.phase,
    jamCharges: cfg.jam,
    scanCharges: cfg.scan,
    phaseTime: 0,
    boostTime: 0,
    autoPath: [],
    autoTarget: null,
    navPath: [],
    navTarget: null,
    navTime: 0,
    trail: []
  });

  Object.assign(state.agent, {
    x: state.agentStartCell.x + 0.5,
    y: state.agentStartCell.y + 0.5,
    speed: cfg.agentSpeed,
    brain: cfg.brain,
    nodes: new Set(),
    path: [],
    target: null,
    repath: 0,
    jamTime: 0,
    trail: []
  });

  if (startRunning) {
    ui.startScreen.classList.add("hidden");
    ui.resultScreen.classList.add("hidden");
    setMessage(`${cfg.label}启动：${cfg.desc} 先收集 3 个数据核心，再进入出口。`, "GO");
  } else {
    ui.startScreen.classList.remove("hidden");
    ui.resultScreen.classList.add("hidden");
  }
  renderHud();
}

function openExitEdges() {
  // 给左右两个起点稍微开一点环，避免开局被长走廊拖死。
  knockBetween({ x: 0, y: 0 }, { x: 1, y: 0 });
  knockBetween({ x: 0, y: ROWS - 1 }, { x: 1, y: ROWS - 1 });
  knockBetween({ x: COLS - 2, y: Math.floor(ROWS / 2) }, state.exitCell);
}

// ════════════════════════════════════════════════════════════════
// 主循环
// ════════════════════════════════════════════════════════════════

function loop(now) {
  const dt = state.last ? Math.min((now - state.last) / 1000, 0.033) : 0;
  state.last = now;
  if (state.mode === "running") update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  state.time += dt;
  state.frame++;
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  state.revealTime = Math.max(0, state.revealTime - dt);
  state.pulseTime = Math.max(0, state.pulseTime - dt);

  updatePlayer(dt);
  updateAgent(dt);
  checkCollections();
  renderHud();

  if (state.time >= currentDifficulty().timeLimit) {
    endMatch("timeout");
  }
}

// ════════════════════════════════════════════════════════════════
// 玩家
// ════════════════════════════════════════════════════════════════

function updatePlayer(dt) {
  state.player.phaseTime = Math.max(0, state.player.phaseTime - dt);
  state.player.boostTime = Math.max(0, state.player.boostTime - dt);
  state.player.navTime = Math.max(0, state.player.navTime - dt);
  if (state.player.navTime <= 0) {
    state.player.navPath = [];
    state.player.navTarget = null;
  }

  let dx = 0, dy = 0;
  const keys = state.input.keys;
  const pad = state.input.pad;

  if (keys.has("w") || keys.has("arrowup") || pad.has("up")) dy -= 1;
  if (keys.has("s") || keys.has("arrowdown") || pad.has("down")) dy += 1;
  if (keys.has("a") || keys.has("arrowleft") || pad.has("left")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright") || pad.has("right")) dx += 1;

  if (dx || dy) {
    state.player.autoPath = [];
    const len = Math.hypot(dx, dy) || 1;
    movePlayer(dx / len, dy / len, dt);
  } else if (state.player.autoPath.length) {
    const target = state.player.autoPath[0];
    const tx = target.x + 0.5;
    const ty = target.y + 0.5;
    const vx = tx - state.player.x;
    const vy = ty - state.player.y;
    const d = Math.hypot(vx, vy);
    if (d < 0.055) {
      state.player.x = tx;
      state.player.y = ty;
      state.player.autoPath.shift();
    } else {
      movePlayer(vx / d, vy / d, dt);
    }
  }

  pushTrail(state.player.trail, state.player.x, state.player.y, "player");
}

function movePlayer(dx, dy, dt) {
  const speed = state.player.speed * (state.player.boostTime > 0 ? 1.55 : 1);
  let nx = state.player.x + dx * speed * dt;
  let ny = state.player.y + dy * speed * dt;

  if (state.player.phaseTime > 0) {
    state.player.x = clamp(nx, 0.15, COLS - 0.15);
    state.player.y = clamp(ny, 0.15, ROWS - 0.15);
    return;
  }

  state.player.x = solveAxisX(state.player, nx);
  state.player.y = solveAxisY(state.player, ny);
}

function solveAxisX(actor, nx) {
  const r = actor.radius || 0.18;
  const cx = clamp(Math.floor(actor.x), 0, COLS - 1);
  const cy = clamp(Math.floor(actor.y), 0, ROWS - 1);
  const cell = state.maze[cy][cx];
  if (nx > actor.x) {
    const limit = cx + 1 - r;
    if (cell.e && nx > limit) return limit;
  } else if (nx < actor.x) {
    const limit = cx + r;
    if (cell.w && nx < limit) return limit;
  }
  return clamp(nx, r, COLS - r);
}

function solveAxisY(actor, ny) {
  const r = actor.radius || 0.18;
  const cx = clamp(Math.floor(actor.x), 0, COLS - 1);
  const cy = clamp(Math.floor(actor.y), 0, ROWS - 1);
  const cell = state.maze[cy][cx];
  if (ny > actor.y) {
    const limit = cy + 1 - r;
    if (cell.s && ny > limit) return limit;
  } else if (ny < actor.y) {
    const limit = cy + r;
    if (cell.n && ny < limit) return limit;
  }
  return clamp(ny, r, ROWS - r);
}

// ════════════════════════════════════════════════════════════════
// Agent：分层路径策略竞速
// ════════════════════════════════════════════════════════════════

function updateAgent(dt) {
  const cfg = currentDifficulty();
  state.agent.jamTime = Math.max(0, state.agent.jamTime - dt);
  state.agent.repath -= dt;

  const cell = actorCell(state.agent);
  const target = chooseAgentTarget(cell);
  const targetChanged = !state.agent.target || state.agent.target.x !== target.x || state.agent.target.y !== target.y;

  if (targetChanged || state.agent.repath <= 0 || state.agent.path.length === 0) {
    state.agent.target = target;
    state.agent.path = planAgentPath(cell, target).slice(1);
    state.agent.repath = (state.agent.jamTime > 0 ? 2.1 : 1) * cfg.repath;
  }

  if (state.agent.path.length) {
    const next = state.agent.path[0];
    const tx = next.x + 0.5;
    const ty = next.y + 0.5;
    const vx = tx - state.agent.x;
    const vy = ty - state.agent.y;
    const d = Math.hypot(vx, vy);
    if (d < 0.045) {
      state.agent.x = tx;
      state.agent.y = ty;
      state.agent.path.shift();
    } else {
      const slow = state.agent.jamTime > 0 ? 0.34 : 1;
      const speed = state.agent.speed * slow;
      state.agent.x += vx / d * speed * dt;
      state.agent.y += vy / d * speed * dt;
    }
  }

  pushTrail(state.agent.trail, state.agent.x, state.agent.y, "agent");
}

function chooseAgentTarget(from) {
  const remaining = state.dataNodes.filter(node => !state.agent.nodes.has(node.id));
  if (!remaining.length) return state.exitCell;

  const brain = state.agent.brain || currentDifficulty().brain;

  if (brain === "wander") {
    if (state.agent.target && remaining.some(n => n.id === state.agent.target.id)) return state.agent.target;
    return remaining[randInt(0, remaining.length - 1)];
  }

  if (brain === "greedy") {
    return remaining.slice().sort((a, b) => manhattan(from, a) - manhattan(from, b))[0];
  }

  if (brain === "lookahead") {
    return chooseLookaheadTarget(from, remaining);
  }

  let best = remaining[0];
  let bestLen = Infinity;
  for (const node of remaining) {
    const len = aStar(from, node).length || Infinity;
    if (len < bestLen) { best = node; bestLen = len; }
  }
  return best;
}

function chooseLookaheadTarget(from, remaining) {
  let best = remaining[0];
  let bestScore = Infinity;
  for (const node of remaining) {
    const toNode = aStar(from, node).length || Infinity;
    const left = remaining.filter(n => n.id !== node.id);
    let continuation = 0;
    if (left.length === 0) {
      continuation = aStar(node, state.exitCell).length || Infinity;
    } else {
      continuation = Math.min(...left.map(n => (aStar(node, n).length || Infinity) + (aStar(n, state.exitCell).length || Infinity) * 0.35));
    }
    const score = toNode + continuation;
    if (score < bestScore) { best = node; bestScore = score; }
  }
  return best;
}

function planAgentPath(start, goal) {
  const brain = state.agent.brain || currentDifficulty().brain;
  if (brain === "wander") return fuzzyPath(start, goal, 0.46, COLS * ROWS * 1.5);
  if (brain === "greedy") return fuzzyPath(start, goal, 0.16, COLS * ROWS);
  if (brain === "coach") return aStar(start, goal);
  return aStar(start, goal);
}

function fuzzyPath(start, goal, chaos, maxSteps) {
  const path = [{ x: start.x, y: start.y }];
  const visited = new Set([keyOf(start)]);
  let current = { x: start.x, y: start.y };

  for (let step = 0; step < maxSteps; step++) {
    if (current.x === goal.x && current.y === goal.y) return path;
    let options = neighbors(current);
    if (!options.length) break;

    options = options
      .map(n => ({ ...n, score: manhattan(n, goal) + Math.random() * chaos * 6 + (visited.has(keyOf(n)) ? 2.6 : 0) }))
      .sort((a, b) => a.score - b.score);

    const pickIndex = Math.random() < chaos ? randInt(0, Math.min(options.length - 1, 2)) : 0;
    const next = { x: options[pickIndex].x, y: options[pickIndex].y };
    current = next;
    visited.add(keyOf(current));
    path.push(current);
  }

  const fallback = aStar(current, goal);
  return fallback.length > 1 ? path.concat(fallback.slice(1)) : aStar(start, goal);
}

// ════════════════════════════════════════════════════════════════
// 收集 / 结局 / 能力
// ════════════════════════════════════════════════════════════════

function checkCollections() {
  const pc = actorCell(state.player);
  const ac = actorCell(state.agent);

  for (const node of state.dataNodes) {
    if (!state.player.nodes.has(node.id) && pc.x === node.x && pc.y === node.y) {
      state.player.nodes.add(node.id);
      state.pulseTime = 0.55;
      setMessage(`你夺取了数据核心 ${state.player.nodes.size}/3。`, "CORE");
    }
    if (!state.agent.nodes.has(node.id) && ac.x === node.x && ac.y === node.y) {
      state.agent.nodes.add(node.id);
      setMessage(`${currentDifficulty().agentName} 已同步数据核心 ${state.agent.nodes.size}/3。`, "WARNING");
    }
  }

  for (const p of state.pickups) {
    if (p.taken) continue;
    if (pc.x === p.x && pc.y === p.y) {
      p.taken = true;
      applyPickup(p.type);
    }
  }

  if (state.player.nodes.size >= NODE_COUNT && pc.x === state.exitCell.x && pc.y === state.exitCell.y) {
    endMatch("player");
  }
  if (state.agent.nodes.size >= NODE_COUNT && ac.x === state.exitCell.x && ac.y === state.exitCell.y) {
    endMatch("agent");
  }
}

function applyPickup(type) {
  if (type === "phase") {
    state.player.phaseCharges++;
    setMessage("获得相位晶片：穿墙次数 +1。", "LOOT");
  } else if (type === "jam") {
    state.player.jamCharges++;
    setMessage("获得电磁干扰器：可拖慢 Agent。", "LOOT");
  } else if (type === "scan") {
    state.player.scanCharges++;
    setMessage("获得量子扫描脉冲：可标出你的下一条最短路线。", "LOOT");
  } else if (type === "boost") {
    state.player.boostTime = 4.2;
    setMessage("神经超频启动：移动速度短暂提升。", "BOOST");
  }
}

function useScan() {
  if (state.mode !== "running" || state.player.scanCharges <= 0) return;
  state.player.scanCharges--;

  const start = actorCell(state.player);
  const guide = choosePlayerGuideTarget(start);
  const path = aStar(start, guide.cell);

  if (path.length > 1) {
    state.player.navPath = path.slice(1);
    state.player.navTarget = guide.cell;
    state.player.navTime = 7.5;
    state.player.boostTime = Math.max(state.player.boostTime, 1.35);
  }

  state.revealTime = 4.2;
  const steps = Math.max(0, path.length - 1);
  setMessage(`扫描导航：已标出通往${guide.label}的最短路线（${steps} 格），并短暂超频。红线为 Agent 当前计划。`, "SCAN");
  renderHud();
}

function choosePlayerGuideTarget(from) {
  const remaining = state.dataNodes.filter(node => !state.player.nodes.has(node.id));
  if (!remaining.length) return { cell: state.exitCell, label: "出口" };

  let best = remaining[0];
  let bestLen = Infinity;
  for (const node of remaining) {
    const len = aStar(from, node).length || Infinity;
    if (len < bestLen) { best = node; bestLen = len; }
  }
  return { cell: best, label: `最近未同步核心 ${state.player.nodes.size + 1}/3` };
}

function usePhase() {
  if (state.mode !== "running" || state.player.phaseCharges <= 0 || state.player.phaseTime > 0) return;
  state.player.phaseCharges--;
  state.player.phaseTime = 2.25;
  state.player.autoPath = [];
  setMessage("相位穿墙开启：2 秒内可直接越过墙体。", "PHASE");
  renderHud();
}

function useJam() {
  if (state.mode !== "running" || state.player.jamCharges <= 0) return;
  state.player.jamCharges--;
  state.agent.jamTime = 3.8;
  state.agent.repath = 0;
  setMessage("干扰波命中：VEGA-9 路径模块降速。", "JAM");
  renderHud();
}

function endMatch(result) {
  if (state.mode !== "running") return;
  state.mode = "ended";
  state.winner = result;
  ui.resultScreen.classList.remove("hidden");

  const t = formatTime(state.time);
  const cfg = currentDifficulty();
  if (result === "player") {
    ui.resultTitle.textContent = "你赢了";
    ui.resultText.textContent = `用时 ${t}\n你抢先同步 3 个数据核心，并在 ${cfg.agentName} 抵达前穿过出口。\n这局的关键不是跑得直，而是用道具改写路线。`;
  } else if (result === "agent") {
    ui.resultTitle.textContent = "Agent 获胜";
    ui.resultText.textContent = `用时 ${t}\nVEGA-9 先完成核心同步并抵达出口。\n建议：扫描它的路线，预判它会抢哪一个核心；穿墙不要省。`;
  } else {
    ui.resultTitle.textContent = "黑墙闭合";
    ui.resultText.textContent = `时间 ${t}\n迷宫防火墙完成闭合，双方都被困在协议内部。\n建议：优先抢近核心，再用穿墙道具抄出口近路。`;
  }
}

function setMessage(text, label = "SYS") {
  ui.statusLabel.textContent = label;
  ui.messageText.textContent = text;
  state.messageTimer = 2.8;
}

function renderHud() {
  ui.timerText.textContent = formatTime(state.time);
  ui.playerNodesText.textContent = `${state.player.nodes.size}/3`;
  ui.agentNodesText.textContent = `${state.agent.nodes.size}/3`;
  ui.scanText.textContent = state.player.scanCharges;
  ui.phaseText.textContent = state.player.phaseCharges;
  ui.jamText.textContent = state.player.jamCharges;

  ui.scanBtn.classList.toggle("disabled", state.player.scanCharges <= 0 || state.mode !== "running");
  ui.phaseBtn.classList.toggle("disabled", state.player.phaseCharges <= 0 || state.player.phaseTime > 0 || state.mode !== "running");
  ui.jamBtn.classList.toggle("disabled", state.player.jamCharges <= 0 || state.mode !== "running");
}

// ════════════════════════════════════════════════════════════════
// 迷宫生成 / 放置
// ════════════════════════════════════════════════════════════════

function generateMaze(cols, rows, loopRate) {
  const maze = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => ({
    x, y, n: true, e: true, s: true, w: true, seen: false
  })));

  const stack = [maze[0][0]];
  maze[0][0].seen = true;

  while (stack.length) {
    const cell = stack[stack.length - 1];
    const options = Object.entries(DIRS)
      .map(([dir, d]) => ({ dir, x: cell.x + d.dx, y: cell.y + d.dy }))
      .filter(o => inside(o.x, o.y) && !maze[o.y][o.x].seen);

    if (!options.length) {
      stack.pop();
      continue;
    }
    const next = options[randInt(0, options.length - 1)];
    const target = maze[next.y][next.x];
    cell[next.dir] = false;
    target[DIRS[next.dir].opp] = false;
    target.seen = true;
    stack.push(target);
  }

  const extra = Math.floor(cols * rows * loopRate);
  for (let i = 0; i < extra; i++) {
    const x = randInt(0, cols - 1);
    const y = randInt(0, rows - 1);
    const dirs = shuffle(Object.keys(DIRS));
    for (const dir of dirs) {
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      if (!inside(nx, ny)) continue;
      maze[y][x][dir] = false;
      maze[ny][nx][DIRS[dir].opp] = false;
      break;
    }
  }

  maze.flat().forEach(c => delete c.seen);
  return maze;
}

function placeDataNodes() {
  const anchors = [
    { x: COLS - 4, y: 3 },
    { x: Math.floor(COLS * 0.48), y: Math.floor(ROWS * 0.52) },
    { x: 3, y: ROWS - 4 }
  ];
  return anchors.map((a, i) => ({ ...a, id: `core-${i}` }));
}

function placePickups(count) {
  // 场上道具总量收敛：默认 9 个，扫描 / 穿墙 / 干扰各 3 个。
  // 不再额外刷大量 boost，避免开局满屏都是资源点。
  const types = ["phase", "jam", "scan"];
  const blocked = new Set([
    keyOf(state.startCell), keyOf(state.agentStartCell), keyOf(state.exitCell),
    ...state.dataNodes.map(keyOf)
  ]);
  const result = [];
  let guard = 0;
  while (result.length < count && guard++ < 4000) {
    const cell = { x: randInt(1, COLS - 2), y: randInt(1, ROWS - 2) };
    const k = keyOf(cell);
    if (blocked.has(k)) continue;
    blocked.add(k);
    result.push({ ...cell, type: types[result.length % types.length], taken: false });
  }
  return shuffle(result);
}

function knockBetween(a, b) {
  if (!inside(a.x, a.y) || !inside(b.x, b.y)) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let dir = null;
  if (dx === 1 && dy === 0) dir = "e";
  if (dx === -1 && dy === 0) dir = "w";
  if (dx === 0 && dy === 1) dir = "s";
  if (dx === 0 && dy === -1) dir = "n";
  if (!dir) return;
  state.maze[a.y][a.x][dir] = false;
  state.maze[b.y][b.x][DIRS[dir].opp] = false;
}

// ════════════════════════════════════════════════════════════════
// A*
// ════════════════════════════════════════════════════════════════

function aStar(start, goal) {
  if (!inside(start.x, start.y) || !inside(goal.x, goal.y)) return [];
  const open = [start];
  const came = new Map();
  const g = new Map([[keyOf(start), 0]]);
  const f = new Map([[keyOf(start), manhattan(start, goal)]]);
  const openKeys = new Set([keyOf(start)]);

  while (open.length) {
    let bestIndex = 0;
    for (let i = 1; i < open.length; i++) {
      if ((f.get(keyOf(open[i])) ?? Infinity) < (f.get(keyOf(open[bestIndex])) ?? Infinity)) bestIndex = i;
    }
    const current = open.splice(bestIndex, 1)[0];
    const ck = keyOf(current);
    openKeys.delete(ck);

    if (current.x === goal.x && current.y === goal.y) {
      return reconstruct(came, current);
    }

    for (const nb of neighbors(current)) {
      const nk = keyOf(nb);
      const tentative = (g.get(ck) ?? Infinity) + 1;
      if (tentative < (g.get(nk) ?? Infinity)) {
        came.set(nk, current);
        g.set(nk, tentative);
        f.set(nk, tentative + manhattan(nb, goal));
        if (!openKeys.has(nk)) {
          open.push(nb);
          openKeys.add(nk);
        }
      }
    }
  }
  return [];
}

function reconstruct(came, current) {
  const path = [current];
  while (came.has(keyOf(current))) {
    current = came.get(keyOf(current));
    path.push(current);
  }
  return path.reverse();
}

function neighbors(cell) {
  const c = state.maze[cell.y][cell.x];
  const list = [];
  for (const [dir, d] of Object.entries(DIRS)) {
    if (c[dir]) continue;
    const nx = cell.x + d.dx;
    const ny = cell.y + d.dy;
    if (inside(nx, ny)) list.push({ x: nx, y: ny });
  }
  return list;
}

// ════════════════════════════════════════════════════════════════
// 绘制
// ════════════════════════════════════════════════════════════════

function draw() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  drawBackground(w, h);
  drawMaze();
  drawPickups();
  drawDataNodes();
  drawExit();
  drawRoutes();
  drawTrails();
  drawActor(state.agent, "agent");
  drawActor(state.player, "player");
  drawEffects();
}

function drawBackground(w, h) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.4, 20, w * 0.5, h * 0.45, Math.max(w, h));
  g.addColorStop(0, "#07182d");
  g.addColorStop(0.55, "#030914");
  g.addColorStop(1, "#01030a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = "rgba(54,248,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = -20; x < w; x += 38) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 130, h); ctx.stroke();
  }
  ctx.restore();
}

function drawMaze() {
  const { size, ox, oy } = state.layout;
  ctx.save();
  ctx.translate(ox, oy);

  // 地面
  ctx.fillStyle = "rgba(3, 10, 22, 0.78)";
  roundRect(ctx, -10, -10, COLS * size + 20, ROWS * size + 20, 18);
  ctx.fill();

  ctx.strokeStyle = "rgba(54,248,255,0.13)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * size, 0); ctx.lineTo(x * size, ROWS * size); ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * size); ctx.lineTo(COLS * size, y * size); ctx.stroke();
  }

  ctx.shadowBlur = 13;
  ctx.shadowColor = "#36f8ff";
  ctx.strokeStyle = "rgba(54,248,255,0.84)";
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.beginPath();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = state.maze[y][x];
      const px = x * size;
      const py = y * size;
      if (c.n) { ctx.moveTo(px, py); ctx.lineTo(px + size, py); }
      if (c.e) { ctx.moveTo(px + size, py); ctx.lineTo(px + size, py + size); }
      if (c.s) { ctx.moveTo(px, py + size); ctx.lineTo(px + size, py + size); }
      if (c.w) { ctx.moveTo(px, py); ctx.lineTo(px, py + size); }
    }
  }
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, COLS * size, ROWS * size);
  ctx.restore();
}

function drawDataNodes() {
  const t = state.frame * 0.06;
  for (const node of state.dataNodes) {
    const { x, y } = cellCenter(node);
    const playerHas = state.player.nodes.has(node.id);
    const agentHas = state.agent.nodes.has(node.id);
    const r = state.layout.size * 0.28 + Math.sin(t + node.x) * 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 22;
    ctx.shadowColor = playerHas ? "#9dff6a" : agentHas ? "#ff3c6a" : "#ffd166";
    ctx.fillStyle = playerHas ? "#9dff6a" : agentHas ? "#ff3c6a" : "#ffd166";
    polygon(ctx, 6, r, t);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.2;
    polygon(ctx, 6, r + 4, -t);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPickups() {
  const colors = { phase: "#ff3df2", jam: "#ff3c6a", scan: "#36f8ff" };
  const labels = { phase: "Φ", jam: "EMP", scan: "Ψ" };
  const t = state.frame * 0.08;
  for (const p of state.pickups) {
    if (p.taken) continue;
    const { x, y } = cellCenter(p);
    const s = state.layout.size;
    ctx.save();
    ctx.translate(x, y + Math.sin(t + p.x) * 2);
    ctx.shadowBlur = 18;
    ctx.shadowColor = colors[p.type];
    ctx.fillStyle = colors[p.type];
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#02040a";
    ctx.font = `900 ${Math.max(8, s * 0.23)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labels[p.type], 0, 0.5);
    ctx.restore();
  }
}

function drawExit() {
  const { x, y } = cellCenter(state.exitCell);
  const s = state.layout.size;
  const ready = state.player.nodes.size >= NODE_COUNT;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state.frame * 0.025);
  ctx.shadowBlur = 24;
  ctx.shadowColor = ready ? "#9dff6a" : "#36f8ff";
  ctx.strokeStyle = ready ? "#9dff6a" : "rgba(54,248,255,0.82)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, s * (0.28 + i * 0.12), i * 0.8, Math.PI * 1.25 + i * 0.8);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = ready ? "#9dff6a" : "#84a6ba";
  ctx.font = `900 ${Math.max(9, s * 0.26)}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("EXIT", x, y - s * 0.55);
  ctx.textAlign = "left";
}

function drawRoutes() {
  if (state.player.navTime > 0 && state.player.navPath.length) {
    drawPathLine([actorCell(state.player), ...state.player.navPath], "rgba(54,248,255,0.92)", 4);
    drawNavTarget();
  }
  if (state.revealTime > 0 && state.agent.path.length) {
    drawPathLine([actorCell(state.agent), ...state.agent.path], "rgba(255,60,106,0.82)", 3);
  }
  if (state.player.autoPath.length) {
    drawPathLine([actorCell(state.player), ...state.player.autoPath], "rgba(168,85,255,0.62)", 2);
  }
}

function drawNavTarget() {
  if (!state.player.navTarget) return;
  const p = cellCenter(state.player.navTarget);
  const s = state.layout.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = "rgba(54,248,255,0.95)";
  ctx.shadowBlur = 22;
  ctx.shadowColor = "#36f8ff";
  ctx.lineWidth = 2;
  ctx.rotate(-state.frame * 0.05);
  ctx.strokeRect(-s * 0.38, -s * 0.38, s * 0.76, s * 0.76);
  ctx.restore();
}

function drawPathLine(path, color, width) {
  if (!path || path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([6, 7]);
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.beginPath();
  path.forEach((cell, i) => {
    const p = cellCenter(cell);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawTrails() {
  for (const tr of [state.player.trail, state.agent.trail]) {
    for (let i = 0; i < tr.length; i++) {
      const p = worldPoint(tr[i].x, tr[i].y);
      const alpha = i / tr.length;
      ctx.fillStyle = tr[i].type === "player" ? `rgba(54,248,255,${alpha * 0.22})` : `rgba(255,60,106,${alpha * 0.2})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, state.layout.size * 0.18 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawActor(actor, type) {
  const p = worldPoint(actor.x, actor.y);
  const s = state.layout.size;
  const color = type === "player" ? "#36f8ff" : "#ff3c6a";
  const accent = type === "player" ? "#a855ff" : "#ffd166";

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.shadowBlur = type === "player" && state.player.phaseTime > 0 ? 34 : 22;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.31, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.43, state.frame * 0.04, state.frame * 0.04 + Math.PI * 1.42);
  ctx.stroke();
  ctx.fillStyle = "#02040a";
  ctx.font = `900 ${Math.max(9, s * 0.28)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(type === "player" ? "YOU" : "AI", 0, 0.5);
  ctx.restore();
}

function drawEffects() {
  if (state.player.phaseTime > 0) {
    const p = worldPoint(state.player.x, state.player.y);
    ctx.save();
    ctx.strokeStyle = "rgba(255,61,242,0.9)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 28;
    ctx.shadowColor = "#ff3df2";
    ctx.beginPath();
    ctx.arc(p.x, p.y, state.layout.size * (0.8 + Math.sin(state.frame * 0.2) * 0.08), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (state.agent.jamTime > 0) {
    const p = worldPoint(state.agent.x, state.agent.y);
    ctx.save();
    ctx.strokeStyle = "rgba(255,209,102,0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, state.layout.size * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (state.pulseTime > 0) {
    ctx.save();
    ctx.globalAlpha = state.pulseTime / 0.55 * 0.22;
    ctx.fillStyle = "#9dff6a";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.restore();
  }
}

// ════════════════════════════════════════════════════════════════
// 工具
// ════════════════════════════════════════════════════════════════

function actorCell(actor) {
  return {
    x: clamp(Math.floor(actor.x), 0, COLS - 1),
    y: clamp(Math.floor(actor.y), 0, ROWS - 1)
  };
}

function screenToCell(clientX, clientY) {
  const { size, ox, oy } = state.layout;
  return {
    x: clamp(Math.floor((clientX - ox) / size), 0, COLS - 1),
    y: clamp(Math.floor((clientY - oy) / size), 0, ROWS - 1)
  };
}

function cellCenter(cell) {
  return worldPoint(cell.x + 0.5, cell.y + 0.5);
}

function worldPoint(x, y) {
  const { size, ox, oy } = state.layout;
  return { x: ox + x * size, y: oy + y * size };
}

function pushTrail(trail, x, y, type) {
  if (state.frame % 3 !== 0) return;
  trail.push({ x, y, type });
  if (trail.length > 28) trail.shift();
}

function keyOf(c) { return `${c.x},${c.y}`; }
function inside(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
function manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(t) {
  const m = Math.floor(t / 60).toString().padStart(2, "0");
  const s = (t % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

function polygon(ctx, sides, radius, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + i / sides * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

boot();
