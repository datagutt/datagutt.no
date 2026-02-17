"use client";

import { useEffect, useRef } from "react";
import { setupCanvas } from "../../app/utils/canvas";

const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;

// Tetromino shapes (relative cell positions)
const SHAPES = [
  [[0, 0], [1, 0], [2, 0], [3, 0]],         // I
  [[0, 0], [1, 0], [0, 1], [1, 1]],         // O
  [[0, 0], [1, 0], [2, 0], [1, 1]],         // T
  [[0, 0], [1, 0], [1, 1], [2, 1]],         // S
  [[1, 0], [2, 0], [0, 1], [1, 1]],         // Z
  [[0, 0], [0, 1], [1, 1], [2, 1]],         // L
  [[2, 0], [0, 1], [1, 1], [2, 1]],         // J
];

const COLORS = [
  "rgba(4,47,28,0.6)",
  "rgba(18,85,54,0.5)",
  "rgba(18,131,75,0.5)",
  "rgba(29,198,114,0.4)",
  "rgba(70,226,148,0.35)",
];

type Piece = {
  shape: number[][];
  color: string;
  col: number;
  y: number;       // pixel y position (sub-cell for smooth falling)
  speed: number;
};

type Props = {
  mouseContainerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
};

export default function FallingBlocksCanvas({ mouseContainerRef, className }: Props) {
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

    const pieces: Piece[] = [];
    const landed: Map<string, string> = new Map(); // "col,row" -> color

    const spawnPiece = (): Piece => {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const maxW = Math.max(...shape.map(([c]) => c)) + 1;
      return {
        shape,
        color,
        col: Math.floor(Math.random() * (cols - maxW)),
        y: -STEP * 4,
        speed: 0.3 + Math.random() * 0.8,
      };
    };

    // Initial pieces
    for (let i = 0; i < 8; i++) {
      const p = spawnPiece();
      p.y = Math.random() * h;
      pieces.push(p);
    }

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

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frameCount = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Draw landed cells
      landed.forEach((color, key) => {
        const [c, r] = key.split(",").map(Number);
        ctx.fillStyle = color;
        ctx.fillRect(c * STEP, r * STEP, CELL, CELL);
      });

      // Update & draw falling pieces
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        if (!prefersReduced) {
          p.y += p.speed;
        }

        const pieceRow = Math.floor(p.y / STEP);

        // Check if any cell would land
        const maxR = Math.max(...p.shape.map(([, r]) => r));
        const bottomRow = pieceRow + maxR;

        let shouldLand = bottomRow >= Math.floor(h / STEP) - 1;
        if (!shouldLand) {
          for (const [dc, dr] of p.shape) {
            const checkKey = `${p.col + dc},${pieceRow + dr + 1}`;
            if (landed.has(checkKey)) {
              shouldLand = true;
              break;
            }
          }
        }

        if (shouldLand && pieceRow >= 0) {
          // Land it
          for (const [dc, dr] of p.shape) {
            const key = `${p.col + dc},${pieceRow + dr}`;
            landed.set(key, p.color);
          }
          pieces.splice(i, 1);

          // Check for full rows and clear
          const rowCounts = new Map<number, number>();
          landed.forEach((_, key) => {
            const r = parseInt(key.split(",")[1]);
            rowCounts.set(r, (rowCounts.get(r) || 0) + 1);
          });
          const fullRows: number[] = [];
          rowCounts.forEach((count, row) => {
            if (count >= cols * 0.7) fullRows.push(row);
          });
          if (fullRows.length > 0) {
            // Remove full rows and shift down
            fullRows.sort((a, b) => a - b);
            for (const fr of fullRows) {
              landed.forEach((_, key) => {
                const r = parseInt(key.split(",")[1]);
                if (r === fr) landed.delete(key);
              });
            }
            // Shift cells above down
            const newLanded = new Map<string, string>();
            landed.forEach((color, key) => {
              const [c, r] = key.split(",").map(Number);
              const shift = fullRows.filter((fr) => fr > r).length;
              newLanded.set(`${c},${r + shift}`, color);
            });
            landed.clear();
            newLanded.forEach((v, k) => landed.set(k, v));
          }

          continue;
        }

        // Draw piece
        // Mouse proximity brightens pieces
        for (const [dc, dr] of p.shape) {
          const cx = (p.col + dc) * STEP;
          const cy = p.y + dr * STEP;
          const dx = mouse.x - cx;
          const dy = mouse.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.fillStyle = "rgba(70,226,148,0.7)";
          } else {
            ctx.fillStyle = p.color;
          }
          ctx.fillRect(cx, cy, CELL, CELL);
        }
      }

      // Spawn new pieces periodically
      if (!prefersReduced && frameCount % 90 === 0 && pieces.length < 12) {
        pieces.push(spawnPiece());
      }

      // Cap landed cells (prevent infinite buildup — clear bottom rows)
      if (landed.size > cols * 20) {
        const maxRow = Math.floor(h / STEP);
        for (let r = maxRow; r > maxRow - 3; r--) {
          for (let c = 0; c < cols; c++) {
            landed.delete(`${c},${r}`);
          }
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
