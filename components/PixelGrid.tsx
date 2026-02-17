"use client";

import { useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import { setupCanvas } from "../app/utils/canvas";

const CELL_SIZE = 16;
const GAP = 2;
const STEP = CELL_SIZE + GAP;

// Green palette from tailwind config
const PALETTE = [
  { color: "#042f1c", weight: 0.6 },  // primary-950
  { color: "#125536", weight: 0.25 }, // primary-900
  { color: "#12834b", weight: 0.1 },  // primary-700
  { color: "#1dc672", weight: 0.05 }, // primary-500
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

type PixelGridProps = {
  burstActive?: boolean;
  className?: string;
  mouseContainerRef?: React.RefObject<HTMLElement | null>;
};

export default function PixelGrid({ burstActive, className, mouseContainerRef }: PixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const waveRef = useRef({ phase: 0 });
  const burstRef = useRef({ intensity: 0 });
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const gridRef = useRef<{ r: number; g: number; b: number }[][]>([]);
  const waveTlRef = useRef<gsap.core.Timeline | null>(null);
  const burstTweenRef = useRef<gsap.core.Tween | null>(null);

  const initGrid = useCallback((cols: number, rows: number) => {
    const grid: { r: number; g: number; b: number }[][] = [];
    for (let row = 0; row < rows; row++) {
      grid[row] = [];
      for (let col = 0; col < cols; col++) {
        const [r, g, b] = hexToRgb(pickColor());
        grid[row][col] = { r, g, b };
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
      duration: 6,
      ease: "none",
    });
    waveTlRef.current = waveTl;

    // Mouse tracking — listen on parent container so elements above don't block
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

    // Reduced motion check
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Draw loop
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const grid = gridRef.current;
      const { phase } = waveRef.current;
      const { intensity: burstI } = burstRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const centerX = w / 2;
      const centerY = h / 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cell = grid[row]?.[col];
          if (!cell) continue;

          const x = col * STEP;
          const y = row * STEP;

          // Base alpha
          let alpha = 0.15;

          if (!prefersReduced) {
            // Wave
            const wave =
              Math.sin(phase + col * 0.15 + row * 0.08) * 0.25;
            alpha += wave * 0.5 + 0.125;

            // Mouse proximity
            const dx = mx - (x + CELL_SIZE / 2);
            const dy = my - (y + CELL_SIZE / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              alpha += (1 - dist / 120) * 0.4;
            }

            // Burst
            if (burstI > 0) {
              const bx = centerX - (x + CELL_SIZE / 2);
              const by = centerY - (y + CELL_SIZE / 2);
              const bDist = Math.sqrt(bx * bx + by * by);
              const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
              alpha += burstI * (1 - bDist / maxDist) * 0.6;
            }
          }

          alpha = Math.max(0, Math.min(1, alpha));
          ctx.fillStyle = `rgba(${cell.r},${cell.g},${cell.b},${alpha})`;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    // Handle resize
    const handleResize = () => {
      const newCtx = setupCanvas(canvas);
      const newRect = canvas.getBoundingClientRect();
      const newCols = Math.ceil(newRect.width / STEP);
      const newRows = Math.ceil(newRect.height / STEP);
      gridRef.current = initGrid(newCols, newRows);
      // ctx reference is captured in closure but we need to update draw's ctx
      // Since draw uses the same canvas, setupCanvas already updated it
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      waveTl.kill();
      mouseTarget.removeEventListener("mousemove", handleMouseMove);
      mouseTarget.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, [initGrid]);

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
