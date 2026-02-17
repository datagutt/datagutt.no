"use client";

import { useEffect, useRef } from "react";
import { setupCanvas } from "../../app/utils/canvas";

const CELL = 8;
const GAP = 1;
const STEP = CELL + GAP;

const WALL = "rgba(4,47,28,0.3)";
const FLOOR = "rgba(18,85,54,0.12)";
const FLOOR_LIT = "rgba(29,198,114,0.5)";
const WALL_LIT = "rgba(18,131,75,0.4)";
const DOOR = "rgba(70,226,148,0.2)";

type Room = { x: number; y: number; w: number; h: number };

function generateDungeon(cols: number, rows: number): number[][] {
  // 0 = wall, 1 = floor, 2 = door
  const map: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  const rooms: Room[] = [];
  const attempts = 60;
  const minSize = 4;
  const maxSize = 12;

  // Place rooms
  for (let i = 0; i < attempts; i++) {
    const w = minSize + Math.floor(Math.random() * (maxSize - minSize));
    const h = minSize + Math.floor(Math.random() * (maxSize - minSize));
    const x = 1 + Math.floor(Math.random() * (cols - w - 2));
    const y = 1 + Math.floor(Math.random() * (rows - h - 2));

    const room = { x, y, w, h };
    const overlaps = rooms.some(
      (r) =>
        room.x < r.x + r.w + 2 &&
        room.x + room.w + 2 > r.x &&
        room.y < r.y + r.h + 2 &&
        room.y + room.h + 2 > r.y
    );

    if (!overlaps) {
      rooms.push(room);
      for (let ry = y; ry < y + h; ry++) {
        for (let rx = x; rx < x + w; rx++) {
          if (ry >= 0 && ry < rows && rx >= 0 && rx < cols) {
            map[ry][rx] = 1;
          }
        }
      }
    }
  }

  // Connect rooms with L-shaped corridors
  const carve = (c: number, r: number) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      map[r][c] = map[r][c] || 1;
    }
  };

  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    const ax = Math.floor(a.x + a.w / 2);
    const ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2);
    const by = Math.floor(b.y + b.h / 2);

    // Horizontal then vertical
    let cx = ax;
    while (cx !== bx) {
      carve(cx, ay);
      cx += cx < bx ? 1 : -1;
    }
    let cy = ay;
    while (cy !== by) {
      carve(bx, cy);
      cy += cy < by ? 1 : -1;
    }
  }

  return map;
}

type Props = {
  mouseContainerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
};

export default function DungeonCanvas({ mouseContainerRef, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = setupCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cols = Math.ceil(w / STEP);
    const rows = Math.ceil(h / STEP);

    const dungeon = generateDungeon(cols, rows);

    // Torch / player
    const mouse = { x: w / 2, y: h / 2 };
    const target = mouseContainerRef?.current ?? canvas;
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    target.addEventListener("mousemove", onMove);
    target.addEventListener("mouseleave", onLeave);

    const TORCH = 12; // cells

    // Flickering torch
    let flicker = 0;
    let frameCount = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Torch flicker
      if (frameCount % 4 === 0) {
        flicker = (Math.random() - 0.5) * 2;
      }
      const torchRadius = TORCH + flicker;

      const mCol = Math.floor(mouse.x / STEP);
      const mRow = Math.floor(mouse.y / STEP);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const tile = dungeon[row]?.[col] ?? 0;
          const x = col * STEP;
          const y = row * STEP;

          // Chebyshev distance for blocky torch
          const dist = Math.max(Math.abs(col - mCol), Math.abs(row - mRow));
          const inTorch = dist <= torchRadius;
          const nearTorch = dist <= torchRadius + 3;

          if (tile === 1) {
            // Floor
            if (inTorch) {
              const brightness = 1 - dist / torchRadius;
              const a = 0.12 + brightness * 0.45;
              ctx.fillStyle = `rgba(29,198,114,${a})`;
            } else if (nearTorch) {
              ctx.fillStyle = "rgba(18,85,54,0.08)";
            } else {
              ctx.fillStyle = FLOOR;
            }
          } else {
            // Wall
            if (inTorch) {
              const brightness = 1 - dist / torchRadius;
              const a = 0.15 + brightness * 0.3;
              ctx.fillStyle = `rgba(18,131,75,${a})`;
            } else if (nearTorch) {
              ctx.fillStyle = "rgba(4,47,28,0.15)";
            } else {
              ctx.fillStyle = WALL;
            }
          }

          ctx.fillRect(x, y, CELL, CELL);
        }
      }

      // Draw player cursor
      if (mCol >= 0 && mCol < cols && mRow >= 0 && mRow < rows) {
        ctx.fillStyle = "rgba(131,242,186,0.9)";
        ctx.fillRect(mCol * STEP, mRow * STEP, CELL, CELL);
        // Blink
        if (frameCount % 40 < 25) {
          ctx.fillStyle = "rgba(219,253,236,0.8)";
          ctx.fillRect(
            mCol * STEP + 2,
            mRow * STEP + 2,
            CELL - 4,
            CELL - 4
          );
        }
      }

      frameCount++;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const onResize = () => { setupCanvas(canvas); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      target.removeEventListener("mousemove", onMove);
      target.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [mouseContainerRef]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
