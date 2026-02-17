"use client";

import { useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import { setupCanvas } from "../app/utils/canvas";

const CELL_SIZE = 12;
const GAP = 3;
const STEP = CELL_SIZE + GAP;

// Discrete alpha levels — 8-bit stepped, not smooth
const ALPHA_LEVELS = [0, 0.04, 0.1, 0.2, 0.4, 0.7, 1.0];
function quantize(a: number): number {
  for (let i = ALPHA_LEVELS.length - 1; i >= 0; i--) {
    if (a >= ALPHA_LEVELS[i]) return ALPHA_LEVELS[i];
  }
  return 0;
}

// Green palette
const PALETTE = [
  { color: "#042f1c", weight: 0.55 }, // primary-950
  { color: "#125536", weight: 0.25 }, // primary-900
  { color: "#12834b", weight: 0.12 }, // primary-700
  { color: "#1dc672", weight: 0.06 }, // primary-500
  { color: "#46e294", weight: 0.02 }, // primary-400
];

function pickColor(): string {
  const r = Math.random();
  let cumulative = 0;
  for (const p of PALETTE) {
    cumulative += p.weight;
    if (r <= cumulative) return p.color;
  }
  return PALETTE[0].color;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

type Cell = {
  r: number;
  g: number;
  b: number;
  sparkle: number; // countdown frames
};

type PixelGridProps = {
  burstActive?: boolean;
  className?: string;
  mouseContainerRef?: React.RefObject<HTMLElement | null>;
};

export default function PixelGrid({
  burstActive,
  className,
  mouseContainerRef,
}: PixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const waveRef = useRef({ phase: 0 });
  const burstRef = useRef({ intensity: 0 });
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const gridRef = useRef<Cell[][]>([]);
  const burstTweenRef = useRef<gsap.core.Tween | null>(null);

  const initGrid = useCallback((cols: number, rows: number) => {
    const grid: Cell[][] = [];
    for (let row = 0; row < rows; row++) {
      grid[row] = [];
      for (let col = 0; col < cols; col++) {
        const [r, g, b] = hexToRgb(pickColor());
        grid[row][col] = { r, g, b, sparkle: 0 };
      }
    }
    return grid;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = setupCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cols = Math.ceil(w / STEP);
    const rows = Math.ceil(h / STEP);

    gridRef.current = initGrid(cols, rows);

    // Wave animation
    const waveTl = gsap.timeline({ repeat: -1 });
    waveTl.to(waveRef.current, {
      phase: Math.PI * 2,
      duration: 8,
      ease: "none",
    });

    // Mouse tracking
    const mouseTarget = mouseContainerRef?.current ?? canvas;
    const handleMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - r.left;
      mouseRef.current.y = e.clientY - r.top;
    };
    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };
    mouseTarget.addEventListener("mousemove", handleMouseMove);
    mouseTarget.addEventListener("mouseleave", handleMouseLeave);

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Mouse radius in cells (blocky ring, like roguelike torch)
    const TORCH_RADIUS = 8; // in cells
    let frameCount = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const grid = gridRef.current;
      const { phase } = waveRef.current;
      const { intensity: burstI } = burstRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const centerX = w / 2;
      const centerY = h / 2;

      // Mouse position in cell coords
      const mCol = Math.floor(mx / STEP);
      const mRow = Math.floor(my / STEP);

      // Random sparkles — a few cells flash bright each frame
      if (!prefersReduced && frameCount % 3 === 0) {
        const sparkleCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < sparkleCount; i++) {
          const sr = Math.floor(Math.random() * rows);
          const sc = Math.floor(Math.random() * cols);
          if (grid[sr]?.[sc]) {
            grid[sr][sc].sparkle = 8 + Math.floor(Math.random() * 12);
          }
        }
      }

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cell = grid[row]?.[col];
          if (!cell) continue;

          const x = col * STEP;
          const y = row * STEP;

          let alpha = 0.06;

          if (!prefersReduced) {
            // Stepped wave — floor to create blocky ripple
            const waveVal = Math.sin(phase + col * 0.2 + row * 0.12);
            const steppedWave = Math.floor((waveVal + 1) * 3) / 6; // 0 to 1 in steps
            alpha += steppedWave * 0.15;

            // Torch: Chebyshev distance for square radius
            const cellDist = Math.max(
              Math.abs(col - mCol),
              Math.abs(row - mRow)
            );
            if (cellDist <= TORCH_RADIUS) {
              // Stepped brightness rings
              if (cellDist <= 2) alpha = 0.7;
              else if (cellDist <= 4) alpha = 0.4;
              else if (cellDist <= 6) alpha = 0.2;
              else alpha = Math.max(alpha, 0.1);
            }

            // Sparkle
            if (cell.sparkle > 0) {
              alpha = Math.max(alpha, 0.8);
              cell.sparkle--;
            }

            // Burst
            if (burstI > 0) {
              const bx = centerX - (x + CELL_SIZE / 2);
              const by = centerY - (y + CELL_SIZE / 2);
              const bDist = Math.sqrt(bx * bx + by * by);
              const maxDist = Math.sqrt(
                centerX * centerX + centerY * centerY
              );
              alpha += burstI * (1 - bDist / maxDist) * 0.6;
            }
          }

          alpha = quantize(Math.min(1, alpha));
          if (alpha <= 0) continue;

          ctx.fillStyle = `rgba(${cell.r},${cell.g},${cell.b},${alpha})`;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }

      frameCount++;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
      setupCanvas(canvas);
      const newRect = canvas.getBoundingClientRect();
      const newCols = Math.ceil(newRect.width / STEP);
      const newRows = Math.ceil(newRect.height / STEP);
      gridRef.current = initGrid(newCols, newRows);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      waveTl.kill();
      mouseTarget.removeEventListener("mousemove", handleMouseMove);
      mouseTarget.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, [initGrid, mouseContainerRef]);

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
