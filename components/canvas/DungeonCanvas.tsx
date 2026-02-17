"use client";

import { useEffect, useRef } from "react";
import { setupCanvas } from "../../app/utils/canvas";
import { getAdaptiveCanvasFrameInterval } from "../../app/utils/performance";
import { useResizeKey } from "../../hooks/useResizeKey";

const CELL = 8;
const GAP = 1;
const STEP = CELL + GAP;

type Room = { x: number; y: number; w: number; h: number };

// BFS pathfinding with parent-pointer tracking (O(n) vs O(n*L) path accumulation)
function findPath(
  map: number[][],
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  rows: number,
  cols: number
): [number, number][] | null {
  const size = cols * rows;
  const visited = new Uint8Array(size);
  const parent = new Int32Array(size).fill(-1);
  const toIdx = (c: number, r: number) => r * cols + c;

  const startIdx = toIdx(startCol, startRow);
  const endIdx = toIdx(endCol, endRow);
  visited[startIdx] = 1;

  const queue: [number, number][] = [[startCol, startRow]];
  let head = 0;
  const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  while (head < queue.length) {
    const [cc, cr] = queue[head++];
    if (cc === endCol && cr === endRow) {
      // Reconstruct path from parent pointers
      const path: [number, number][] = [];
      let idx = endIdx;
      while (idx !== startIdx) {
        const c = idx % cols;
        const r = (idx - c) / cols;
        path.push([c, r]);
        idx = parent[idx];
      }
      path.push([startCol, startRow]);
      path.reverse();
      return path;
    }

    for (const [dc, dr] of dirs) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        const nIdx = toIdx(nc, nr);
        if (map[nr][nc] === 1 && !visited[nIdx]) {
          visited[nIdx] = 1;
          parent[nIdx] = toIdx(cc, cr);
          queue.push([nc, nr]);
        }
      }
    }
  }
  return null;
}

function generateDungeon(cols: number, rows: number) {
  const map: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  const rooms: Room[] = [];
  const attempts = 80;

  for (let i = 0; i < attempts; i++) {
    const w = 4 + Math.floor(Math.random() * 8);
    const h = 4 + Math.floor(Math.random() * 6);
    const x = 1 + Math.floor(Math.random() * (cols - w - 2));
    const y = 1 + Math.floor(Math.random() * (rows - h - 2));
    const room = { x, y, w, h };
    const overlaps = rooms.some(
      (r) =>
        room.x < r.x + r.w + 2 && room.x + room.w + 2 > r.x &&
        room.y < r.y + r.h + 2 && room.y + room.h + 2 > r.y
    );
    if (!overlaps) {
      rooms.push(room);
      for (let ry = y; ry < y + h; ry++)
        for (let rx = x; rx < x + w; rx++)
          if (ry < rows && rx < cols) map[ry][rx] = 1;
    }
  }

  const carve = (c: number, r: number) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) map[r][c] = map[r][c] || 1;
  };

  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    const ax = Math.floor(a.x + a.w / 2);
    const ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2);
    const by = Math.floor(b.y + b.h / 2);
    let cx = ax;
    while (cx !== bx) { carve(cx, ay); cx += cx < bx ? 1 : -1; }
    let cy = ay;
    while (cy !== by) { carve(bx, cy); cy += cy < by ? 1 : -1; }
  }

  return { map, rooms };
}

// Pre-compute color lookup tables for tile colors
const TILE_ALPHA_STEPS = 50;
const floorColors: string[] = new Array(TILE_ALPHA_STEPS + 1);
const wallColors: string[] = new Array(TILE_ALPHA_STEPS + 1);
for (let i = 0; i <= TILE_ALPHA_STEPS; i++) {
  const a = (i / TILE_ALPHA_STEPS).toFixed(3);
  floorColors[i] = `rgba(29,198,114,${a})`;
  wallColors[i] = `rgba(4,47,28,${a})`;
}

type Enemy = {
  col: number;
  row: number;
  hp: number;
  flash: number;
  dead: boolean;
};

type Props = {
  paused?: boolean;
  mouseContainerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
};

export default function DungeonCanvas({ paused = false, mouseContainerRef, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const pausedRef = useRef(paused);
  const drawRef = useRef<((time: number) => void) | null>(null);
  const resizeKey = useResizeKey(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = setupCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cols = Math.ceil(w / STEP);
    const rows = Math.ceil(h / STEP);

    const { map, rooms } = generateDungeon(cols, rows);

    // Player state
    const startRoom = rooms[0] || { x: 1, y: 1, w: 3, h: 3 };
    const player = {
      col: Math.floor(startRoom.x + startRoom.w / 2),
      row: Math.floor(startRoom.y + startRoom.h / 2),
      targetRoom: 1,
      path: [] as [number, number][],
      pathIdx: 0,
      moveTimer: 0,
      moveSpeed: 4, // frames per step
      trail: [] as [number, number][],
      attackFlash: 0,
      score: 0,
    };

    // Enemies — place 1-2 per room (skip first room)
    const enemies: Enemy[] = [];
    for (let i = 1; i < rooms.length; i++) {
      const rm = rooms[i];
      const count = 1 + Math.floor(Math.random() * 2);
      for (let j = 0; j < count; j++) {
        enemies.push({
          col: rm.x + 1 + Math.floor(Math.random() * (rm.w - 2)),
          row: rm.y + 1 + Math.floor(Math.random() * (rm.h - 2)),
          hp: 2 + Math.floor(Math.random() * 2),
          flash: 0,
          dead: false,
        });
      }
    }

    // Revealed tiles (fog of war) — Uint8Array instead of Set<string>
    const revealed = new Uint8Array(cols * rows);
    const TORCH = 10;

    const revealAround = (c: number, r: number) => {
      for (let dy = -TORCH; dy <= TORCH; dy++) {
        for (let dx = -TORCH; dx <= TORCH; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) <= TORCH) {
            const rc = c + dx;
            const rr = r + dy;
            if (rc >= 0 && rc < cols && rr >= 0 && rr < rows) {
              revealed[rr * cols + rc] = 1;
            }
          }
        }
      }
    };
    revealAround(player.col, player.row);

    // Navigate to next room
    const navigateToRoom = (roomIdx: number) => {
      if (roomIdx >= rooms.length) roomIdx = 0;
      const rm = rooms[roomIdx];
      const tx = Math.floor(rm.x + rm.w / 2);
      const ty = Math.floor(rm.y + rm.h / 2);
      const path = findPath(map, player.col, player.row, tx, ty, rows, cols);
      if (path) {
        player.path = path;
        player.pathIdx = 0;
        player.targetRoom = roomIdx;
      } else {
        // Can't reach, try next
        player.targetRoom = (roomIdx + 1) % rooms.length;
      }
    };

    // Defer initial pathfinding so first frame draws before BFS runs
    setTimeout(() => navigateToRoom(1), 0);

    // Mouse (separate torch for viewer)
    const mouse = { x: -1000, y: -1000 };
    const target = mouseContainerRef?.current ?? canvas;
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => { mouse.x = -1000; mouse.y = -1000; };
    target.addEventListener("mousemove", onMove);
    target.addEventListener("mouseleave", onLeave);

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const FRAME_INTERVAL = getAdaptiveCanvasFrameInterval(prefersReduced);
    let lastFrameTime = 0;
    let frameCount = 0;
    let flicker = 0;

    const draw = (time: number) => {
      if (pausedRef.current) return;

      if (time - lastFrameTime < FRAME_INTERVAL) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = time;

      ctx.clearRect(0, 0, w, h);

      // Torch flicker
      if (frameCount % 5 === 0) flicker = (Math.random() - 0.5) * 2;
      const torchR = TORCH + flicker;

      // Move player
      if (!prefersReduced) {
        player.moveTimer++;
        if (player.moveTimer >= player.moveSpeed) {
          player.moveTimer = 0;

          if (player.pathIdx < player.path.length) {
            const [nc, nr] = player.path[player.pathIdx];
            player.trail.push([player.col, player.row]);
            if (player.trail.length > 40) player.trail.shift();
            player.col = nc;
            player.row = nr;
            player.pathIdx++;
            revealAround(player.col, player.row);

            // Check enemy collision
            for (const enemy of enemies) {
              if (!enemy.dead && enemy.col === player.col && enemy.row === player.row) {
                enemy.hp--;
                enemy.flash = 10;
                player.attackFlash = 8;
                if (enemy.hp <= 0) {
                  enemy.dead = true;
                  player.score++;
                }
              }
            }
          } else {
            // Reached target, pick next room
            const next = (player.targetRoom + 1) % rooms.length;
            navigateToRoom(next);
          }
        }
      }

      if (player.attackFlash > 0) player.attackFlash--;

      // Mouse position in cells
      const mCol = Math.floor(mouse.x / STEP);
      const mRow = Math.floor(mouse.y / STEP);

      // Draw tiles
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const tile = map[row]?.[col] ?? 0;
          const x = col * STEP;
          const y = row * STEP;
          const isRevealed = revealed[row * cols + col];

          // Distance from player (player torch)
          const pDist = Math.max(
            Math.abs(col - player.col),
            Math.abs(row - player.row)
          );
          const inPlayerTorch = pDist <= torchR;

          // Distance from mouse (viewer torch)
          const mDist = Math.max(Math.abs(col - mCol), Math.abs(row - mRow));
          const inMouseTorch = mDist <= 8;

          let alpha = 0;

          if (inPlayerTorch) {
            const brightness = 1 - pDist / torchR;
            alpha = tile === 1
              ? 0.1 + brightness * 0.5
              : 0.08 + brightness * 0.25;
          } else if (inMouseTorch) {
            const brightness = 1 - mDist / 8;
            alpha = tile === 1
              ? 0.05 + brightness * 0.25
              : 0.03 + brightness * 0.12;
          } else if (isRevealed) {
            alpha = tile === 1 ? 0.06 : 0.03;
          } else {
            alpha = 0.01;
          }

          const alphaIdx = Math.round(alpha * TILE_ALPHA_STEPS);
          ctx.fillStyle = tile === 1 ? floorColors[alphaIdx] : wallColors[alphaIdx];
          ctx.fillRect(x, y, CELL, CELL);
        }
      }

      // Draw trail
      for (let i = 0; i < player.trail.length; i++) {
        const [tc, tr] = player.trail[i];
        const age = 1 - i / player.trail.length;
        ctx.fillStyle = `rgba(18,131,75,${age * 0.15})`;
        ctx.fillRect(tc * STEP + 1, tr * STEP + 1, CELL - 2, CELL - 2);
      }

      // Draw enemies
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        const ex = enemy.col * STEP;
        const ey = enemy.row * STEP;

        // Only draw if revealed or in torch range
        const eDist = Math.max(
          Math.abs(enemy.col - player.col),
          Math.abs(enemy.row - player.row)
        );
        if (eDist > torchR + 3 && !revealed[enemy.row * cols + enemy.col]) continue;

        if (enemy.flash > 0) {
          // Hit flash — red
          ctx.fillStyle = `rgba(255,60,60,${0.5 + enemy.flash * 0.05})`;
          enemy.flash--;
        } else {
          ctx.fillStyle = "rgba(255,80,80,0.7)";
        }
        // Small enemy sprite: 3x3 pixel cross
        ctx.fillRect(ex + 3, ey + 1, 2, CELL - 2); // vertical
        ctx.fillRect(ex + 1, ey + 3, CELL - 2, 2); // horizontal
      }

      // Draw player
      const px = player.col * STEP;
      const py = player.row * STEP;

      if (player.attackFlash > 0) {
        // Attack flash — bright
        ctx.fillStyle = "rgba(219,253,236,0.9)";
      } else {
        ctx.fillStyle = "rgba(131,242,186,0.9)";
      }
      ctx.fillRect(px, py, CELL, CELL);

      // Player inner eye blink
      if (frameCount % 60 < 45) {
        ctx.fillStyle = "rgba(4,47,28,0.8)";
        ctx.fillRect(px + 2, py + 2, 2, 2);
        ctx.fillRect(px + CELL - 4, py + 2, 2, 2);
      }

      // Score display
      if (player.score > 0) {
        ctx.fillStyle = "rgba(131,242,186,0.4)";
        ctx.font = "10px monospace";
        ctx.fillText(`x${player.score}`, px + CELL + 4, py + CELL - 1);
      }

      frameCount++;
      animRef.current = requestAnimationFrame(draw);
    };

    drawRef.current = draw;
    draw(performance.now()); // sync first frame
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      drawRef.current = null;
      target.removeEventListener("mousemove", onMove);
      target.removeEventListener("mouseleave", onLeave);
    };
  }, [mouseContainerRef, resizeKey]);

  // Pause / resume
  useEffect(() => {
    const wasPaused = pausedRef.current;
    pausedRef.current = paused;
    if (!paused && wasPaused && drawRef.current) {
      animRef.current = requestAnimationFrame(drawRef.current);
    }
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
