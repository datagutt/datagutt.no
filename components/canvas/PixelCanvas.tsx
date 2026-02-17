"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { setupCanvas } from "../../app/utils/canvas";
import { useResizeKey } from "../../hooks/useResizeKey";

const CELL = 14;
const GAP = 2;
const STEP = CELL + GAP;

// Green palette with RGB values for fast rendering
const PALETTE = [
  { r: 4, g: 47, b: 28, weight: 0.45 },   // primary-950
  { r: 18, g: 85, b: 54, weight: 0.25 },   // primary-900
  { r: 18, g: 131, b: 75, weight: 0.15 },  // primary-700
  { r: 29, g: 198, b: 114, weight: 0.10 }, // primary-500
  { r: 70, g: 226, b: 148, weight: 0.05 }, // primary-400
];

function pickPalette() {
  const roll = Math.random();
  let cum = 0;
  for (const p of PALETTE) {
    cum += p.weight;
    if (roll <= cum) return p;
  }
  return PALETTE[0];
}

type Cell = {
  r: number;
  g: number;
  b: number;
  life: number;    // 0 = off, 1 = alive (for Game of Life pockets)
};

type Pulse = {
  col: number;
  row: number;
  dirCol: number;
  dirRow: number;
  length: number;
  head: number; // position along the line
  speed: number;
  color: { r: number; g: number; b: number };
};

type PixelCanvasProps = {
  burstActive?: boolean;
  className?: string;
  mouseContainerRef?: React.RefObject<HTMLElement | null>;
};

export default function PixelCanvas({
  burstActive,
  className,
  mouseContainerRef,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const burstRef = useRef({ intensity: 0 });
  const burstTweenRef = useRef<gsap.core.Tween | null>(null);
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

    // Init grid
    const grid: Cell[][] = [];
    for (let row = 0; row < rows; row++) {
      grid[row] = [];
      for (let col = 0; col < cols; col++) {
        const p = pickPalette();
        grid[row][col] = {
          r: p.r, g: p.g, b: p.b,
          life: Math.random() < 0.08 ? 1 : 0,
        };
      }
    }

    // Data pulses — lines of bright cells traveling across the grid
    const pulses: Pulse[] = [];
    const spawnPulse = () => {
      const horizontal = Math.random() > 0.4;
      const p = pickPalette();
      if (horizontal) {
        pulses.push({
          col: -1,
          row: Math.floor(Math.random() * rows),
          dirCol: 1, dirRow: 0,
          length: 3 + Math.floor(Math.random() * 6),
          head: 0,
          speed: 0.15 + Math.random() * 0.2,
          color: { r: p.r, g: p.g, b: p.b },
        });
      } else {
        pulses.push({
          col: Math.floor(Math.random() * cols),
          row: -1,
          dirCol: 0, dirRow: 1,
          length: 3 + Math.floor(Math.random() * 5),
          head: 0,
          speed: 0.1 + Math.random() * 0.15,
          color: { r: p.r, g: p.g, b: p.b },
        });
      }
    };

    // Mouse
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

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let frameCount = 0;

    // Pulse brightness map (col,row -> alpha boost)
    const pulseMap = new Map<string, number>();

    // Game of Life step (runs on a slow timer)
    const lifeStep = () => {
      const next: number[][] = [];
      for (let r = 0; r < rows; r++) {
        next[r] = [];
        for (let c = 0; c < cols; c++) {
          let neighbors = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                neighbors += grid[nr][nc].life;
              }
            }
          }
          const alive = grid[r][c].life;
          if (alive && (neighbors === 2 || neighbors === 3)) next[r][c] = 1;
          else if (!alive && neighbors === 3) next[r][c] = 1;
          else next[r][c] = 0;
        }
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          grid[r][c].life = next[r][c];
        }
      }

      // Seed a few random cells to keep it alive
      for (let i = 0; i < 5; i++) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        grid[r][c].life = 1;
      }
    };

    // Seed life near mouse
    const seedLife = (mCol: number, mRow: number) => {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const r = mRow + dr;
          const c = mCol + dc;
          if (r >= 0 && r < rows && c >= 0 && c < cols && Math.random() < 0.3) {
            grid[r][c].life = 1;
          }
        }
      }
    };

    let lastMCol = -1;
    let lastMRow = -1;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      const mCol = Math.floor(mouse.x / STEP);
      const mRow = Math.floor(mouse.y / STEP);
      const { intensity: burstI } = burstRef.current;
      const centerX = w / 2;
      const centerY = h / 2;

      // Seed life when mouse moves to a new cell
      if (!prefersReduced && (mCol !== lastMCol || mRow !== lastMRow)) {
        if (mCol >= 0 && mCol < cols && mRow >= 0 && mRow < rows) {
          seedLife(mCol, mRow);
        }
        lastMCol = mCol;
        lastMRow = mRow;
      }

      // Game of Life tick every 24 frames
      if (!prefersReduced && frameCount % 24 === 0) {
        lifeStep();
      }

      // Update pulses
      pulseMap.clear();
      if (!prefersReduced) {
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i];
          p.head += p.speed;

          const headPos = Math.floor(p.head);
          // Mark cells in the pulse tail
          for (let t = 0; t < p.length; t++) {
            const pos = headPos - t;
            const c = p.col + p.dirCol * pos;
            const r = p.row + p.dirRow * pos;
            if (c >= 0 && c < cols && r >= 0 && r < rows) {
              const fade = 1 - t / p.length;
              const key = `${c},${r}`;
              pulseMap.set(key, Math.max(pulseMap.get(key) || 0, fade));
            }
          }

          // Remove if fully off-screen
          const headC = p.col + p.dirCol * headPos;
          const headR = p.row + p.dirRow * headPos;
          if (headC > cols + p.length || headR > rows + p.length) {
            pulses.splice(i, 1);
          }
        }

        // Spawn pulses
        if (frameCount % 60 === 0 && pulses.length < 6) {
          spawnPulse();
        }
      }

      // Draw cells
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cell = grid[row][col];
          const x = col * STEP;
          const y = row * STEP;

          let alpha = 0.03;

          // Life glow
          if (cell.life) alpha = 0.25;

          // Pulse glow
          const pulseVal = pulseMap.get(`${col},${row}`);
          if (pulseVal) alpha = Math.max(alpha, pulseVal * 0.7);

          // Mouse proximity — diamond shape, blocky rings
          if (!prefersReduced) {
            const cellDist = Math.abs(col - mCol) + Math.abs(row - mRow); // Manhattan
            if (cellDist <= 3) alpha = Math.max(alpha, 0.6);
            else if (cellDist <= 6) alpha = Math.max(alpha, 0.3);
            else if (cellDist <= 10) alpha = Math.max(alpha, 0.12);
          }

          // Burst
          if (burstI > 0) {
            const bx = centerX - (x + CELL / 2);
            const by = centerY - (y + CELL / 2);
            const bDist = Math.sqrt(bx * bx + by * by);
            const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
            alpha = Math.max(alpha, burstI * (1 - bDist / maxDist) * 0.7);
          }

          alpha = Math.min(1, alpha);
          if (alpha < 0.02) continue;

          const cr = cell.r;
          const cg = cell.g;
          const cb = cell.b;

          // 3D cell rendering for bright cells
          if (alpha > 0.3) {
            // Main fill
            ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
            ctx.fillRect(x, y, CELL, CELL);
            // Top-left highlight
            ctx.fillStyle = `rgba(255,255,255,${alpha * 0.08})`;
            ctx.fillRect(x, y, CELL, 1);
            ctx.fillRect(x, y, 1, CELL);
            // Bottom-right shadow
            ctx.fillStyle = `rgba(0,0,0,${alpha * 0.15})`;
            ctx.fillRect(x + CELL - 1, y, 1, CELL);
            ctx.fillRect(x, y + CELL - 1, CELL, 1);
          } else {
            ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
            ctx.fillRect(x, y, CELL, CELL);
          }
        }
      }

      frameCount++;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      target.removeEventListener("mousemove", onMove);
      target.removeEventListener("mouseleave", onLeave);
    };
  }, [mouseContainerRef, resizeKey]);

  // Burst effect
  useEffect(() => {
    if (burstActive) {
      burstTweenRef.current?.kill();
      burstRef.current.intensity = 0;
      burstTweenRef.current = gsap.to(burstRef.current, {
        intensity: 1,
        duration: 0.45,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
      });
    }
  }, [burstActive]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
