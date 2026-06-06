# neon-labyrinth-race

# Neon Labyrinth Race

# 霓虹迷宫竞速

A sci-fi AI maze racing game. The player competes with an autonomous Agent inside a neon labyrinth, collects data cores, uses tactical items, and races to the exit.

一个科幻风格的 AI 迷宫竞速小游戏。玩家需要在霓虹迷宫中与智能体 Agent 实时竞争，抢先同步数据核心，并冲向出口。

---

## English

## Overview

**Neon Labyrinth Race** is a pure front-end interactive demo built with HTML, CSS, and JavaScript.

The core gameplay is:

> The player and an AI Agent race inside the same maze.
> The player must collect 3 data cores and reach the exit before the Agent does.

The project demonstrates:

* Random maze generation
* Real-time player control
* AI Agent path planning
* Multiple Agent difficulty levels
* A sci-fi HUD interface
* Tactical items such as Scan, Phase, and Jammer

No backend or installation is required. Open `index.html` directly to play.

---

## Live Demo

After enabling GitHub Pages, the game will be available at:

```text
https://your-username.github.io/neon-labyrinth-race/
```

---

## Game Objective

The player needs to:

1. Navigate through the neon maze;
2. Synchronize 3 data cores;
3. Use items strategically;
4. Reach the exit before the AI Agent.

If the Agent collects all required cores and reaches the exit first, the player loses.

---

## Controls

| Control       | Function                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| W / A / S / D | Move player                                                              |
| Arrow keys    | Move player                                                              |
| Scan          | Show the recommended path to the nearest unsynchronized core or the exit |
| Phase         | Temporarily pass through walls                                           |
| Jammer        | Temporarily slow down the Agent                                          |

---

## Difficulty Levels

The game includes multiple Agent strategies:

| Mode       | Agent Strategy                                                          |
| ---------- | ----------------------------------------------------------------------- |
| Training   | Basic A* Agent with lower speed, suitable for learning                  |
| Greedy     | Chooses the locally nearest target, but may be misled by maze structure |
| Standard   | Uses A* pathfinding for efficient route planning                        |
| Predictive | Considers core order and exit position for stronger planning            |

---

## Item System

The player starts with:

* Scan × 1
* Phase × 1
* Jammer × 1

A limited number of item supplies are placed in the maze.
The item system is intentionally constrained to keep the race tense and strategic.

---

## Project Structure

```text
neon-labyrinth-race/
├── index.html      # Page structure
├── styles.css      # Sci-fi interface and visual style
├── app.js          # Game logic, maze generation, Agent pathfinding
└── README.md       # Project documentation
```

---

## Tech Stack

* HTML5
* CSS3
* JavaScript
* Canvas 2D

---

## Highlights

1. **Real-time AI competition**
   The Agent actively plans routes instead of moving randomly.

2. **Meaningful Scan mechanic**
   Scan shows the recommended path for the player, making it useful for decision-making.

3. **Tactical item design**
   Phase enables shortcuts, Jammer slows the Agent, and Scan improves navigation.

4. **Sci-fi visual identity**
   The interface uses neon colors, HUD elements, glowing paths, and a cyberpunk-style maze.

---

## Future Improvements

* Add leaderboard and best-time records
* Add more Agent strategies, such as reinforcement learning or noisy planning Agents
* Add more map mechanics, such as teleporters, locked gates, or moving walls
* Add cooldown-based skill systems
* Add online race mode or challenge mode

---

## 中文

## 项目简介

**Neon Labyrinth Race｜霓虹迷宫竞速** 是一个基于 HTML、CSS 和 JavaScript 实现的纯前端交互式小游戏。

核心玩法是：

> 玩家与 AI Agent 在同一个迷宫中实时竞速。
> 玩家需要抢先同步 3 个数据核心，并在 Agent 之前抵达出口。

本项目主要展示：

* 随机迷宫生成
* 玩家实时操作
* AI Agent 路径规划
* 多难度智能体策略
* 科幻 HUD 风格界面
* 扫描、穿墙、干扰等战术道具

无需后端，无需安装依赖，直接打开 `index.html` 即可运行。

---

## 在线体验

启用 GitHub Pages 后，可通过以下地址访问：

```text
https://你的用户名.github.io/neon-labyrinth-race/
```

---

## 游戏目标

玩家需要完成以下任务：

1. 在霓虹迷宫中移动探索；
2. 同步 3 个数据核心；
3. 合理使用扫描、穿墙、干扰道具；
4. 在 AI Agent 之前抵达出口。

如果 Agent 率先完成核心同步并抵达出口，则玩家失败。

---

## 操作方式

| 操作            | 功能                   |
| ------------- | -------------------- |
| W / A / S / D | 移动玩家                 |
| 方向键           | 移动玩家                 |
| 扫描            | 显示玩家到最近未同步核心或出口的推荐路线 |
| 穿墙            | 短时间内无视墙体移动           |
| 干扰            | 短时间降低 Agent 移动速度     |

---

## 难度设计

游戏包含多种 Agent 策略：

| 模式  | Agent 特点                |
| --- | ----------------------- |
| 训练局 | 基础 A* Agent，速度较慢，适合熟悉操作 |
| 贪婪局 | 优先选择局部最近目标，但可能被迷宫结构误导   |
| 标准局 | 使用 A* 寻路，整体路线效率较高       |
| 预测局 | 综合考虑核心顺序和出口位置，规划能力更强    |

---

## 道具系统

玩家开局拥有：

* 扫描 × 1
* 穿墙 × 1
* 干扰 × 1

迷宫中会生成少量补给点，用于补充道具。
道具数量经过限制，避免道具过多削弱竞速紧张感。

---

## 文件结构

```text
neon-labyrinth-race/
├── index.html      # 页面结构
├── styles.css      # 科幻界面与视觉样式
├── app.js          # 游戏逻辑、迷宫生成、Agent 寻路
└── README.md       # 项目说明
```

---

## 技术栈

* HTML5
* CSS3
* JavaScript
* Canvas 2D

---

## 项目亮点

1. **实时 AI 竞速**
   Agent 会主动规划路线，而不是随机移动。

2. **扫描机制具有实际作用**
   扫描可以显示玩家到最近核心或出口的推荐路线，帮助玩家做路线决策。

3. **道具影响胜负**
   穿墙可以抄近路，干扰可以拖慢 Agent，扫描可以辅助判断路线。

4. **强科幻视觉风格**
   页面采用霓虹色彩、HUD 信息面板、发光路径和赛博迷宫风格，适合作为展示型 demo。

---

## 后续可扩展方向

* 增加排行榜和最短通关时间记录
* 增加更多 Agent 策略，例如强化学习 Agent、带噪声规划 Agent、预测型 Agent
* 增加更多地图机制，例如传送门、锁门、移动墙体
* 增加技能冷却系统
* 增加在线竞速或挑战模式

---

## License

This project is for learning, demo, and research presentation purposes.

本项目主要用于学习、展示和科研汇报场景。
