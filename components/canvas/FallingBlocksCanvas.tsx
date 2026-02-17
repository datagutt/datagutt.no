"use client";

import { useEffect, useRef } from "react";
import { setupCanvas } from "../../app/utils/canvas";

const CELL = 20;
const GAP = 2;
const STEP = CELL + GAP;

// Standard tetromino shapes — each is a 4x4 grid of rotations
// Stored as [rotation][row][col]
const SHAPES: number[][][][] = [
  // I
  [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  // O
  [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ],
  // T
  [
    [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  // S
  [
    [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
    [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  // Z
  [
    [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
  ],
  // L
  [
    [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
    [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  // J
  [
    [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
  ],
];

const PIECE_COLORS = [
  { fill: "rgba(29,198,114,0.6)", border: "rgba(70,226,148,0.4)" },   // I
  { fill: "rgba(18,131,75,0.6)", border: "rgba(29,198,114,0.4)" },    // O
  { fill: "rgba(70,226,148,0.5)", border: "rgba(131,242,186,0.3)" },  // T
  { fill: "rgba(18,85,54,0.7)", border: "rgba(18,131,75,0.5)" },      // S
  { fill: "rgba(4,47,28,0.8)", border: "rgba(18,85,54,0.5)" },        // Z
  { fill: "rgba(29,198,114,0.45)", border: "rgba(70,226,148,0.3)" },  // L
  { fill: "rgba(18,131,75,0.5)", border: "rgba(29,198,114,0.35)" },   // J
];

type Piece = {
  shape: number;
  rotation: number;
  col: number;
  row: number; // grid row (float for smooth movement)
  speed: number;
  rotateTimer: number;
  rotateInterval: number;
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
    const gridCols = Math.floor(w / STEP);
    const gridRows = Math.floor(h / STEP);

    // Landed grid: -1 = empty, 0-6 = piece color index
    const grid: number[][] = Array.from({ length: gridRows }, () =>
      Array(gridCols).fill(-1)
    );

    const pieces: Piece[] = [];

    const spawnPiece = (): Piece => {
      const shape = Math.floor(Math.random() * SHAPES.length);
      return {
        shape,
        rotation: Math.floor(Math.random() * 4),
        col: Math.floor(Math.random() * (gridCols - 4)),
        row: -4,
        speed: 0.015 + Math.random() * 0.025,
        rotateTimer: 0,
        rotateInterval: 60 + Math.floor(Math.random() * 120),
      };
    };

    // Start with a few
    for (let i = 0; i < 5; i++) {
      const p = spawnPiece();
      p.row = Math.random() * gridRows * 0.6 - 4;
      pieces.push(p);
    }

    const getShape = (p: Piece) => SHAPES[p.shape][p.rotation];

    const collides = (p: Piece, rowOffset: number, colOffset: number, rot?: number): boolean => {
      const shape = SHAPES[p.shape][rot ?? p.rotation];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (!shape[r][c]) continue;
          const gr = Math.floor(p.row + rowOffset) + r;
          const gc = p.col + colOffset + c;
          if (gc < 0 || gc >= gridCols || gr >= gridRows) return true;
          if (gr >= 0 && grid[gr][gc] !== -1) return true;
        }
      }
      return false;
    };

    const lockPiece = (p: Piece) => {
      const shape = getShape(p);
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (!shape[r][c]) continue;
          const gr = Math.floor(p.row) + r;
          const gc = p.col + c;
          if (gr >= 0 && gr < gridRows && gc >= 0 && gc < gridCols) {
            grid[gr][gc] = p.shape;
          }
        }
      }
    };

    // Clear full rows
    const clearRows = () => {
      for (let r = gridRows - 1; r >= 0; r--) {
        if (grid[r].every((c) => c !== -1)) {
          grid.splice(r, 1);
          grid.unshift(Array(gridCols).fill(-1));
          r++; // recheck this row
        }
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

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frameCount = 0;

    const drawCell = (x: number, y: number, colorIdx: number, glow: boolean) => {
      const colors = PIECE_COLORS[colorIdx];
      ctx.fillStyle = glow ? colors.border : colors.fill;
      ctx.fillRect(x, y, CELL, CELL);
      // Inner highlight for 3D block feel
      ctx.fillStyle = glow
        ? "rgba(131,242,186,0.3)"
        : "rgba(255,255,255,0.05)";
      ctx.fillRect(x + 1, y + 1, CELL - 2, 2);
      ctx.fillRect(x + 1, y + 1, 2, CELL - 2);
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x + CELL - 2, y + 1, 2, CELL - 1);
      ctx.fillRect(x + 1, y + CELL - 2, CELL - 1, 2);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Draw faint grid lines
      ctx.strokeStyle = "rgba(18,85,54,0.06)";
      ctx.lineWidth = 1;
      for (let c = 0; c <= gridCols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * STEP, 0);
        ctx.lineTo(c * STEP, h);
        ctx.stroke();
      }
      for (let r = 0; r <= gridRows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * STEP);
        ctx.lineTo(w, r * STEP);
        ctx.stroke();
      }

      // Mouse col/row
      const mCol = Math.floor(mouse.x / STEP);
      const mRow = Math.floor(mouse.y / STEP);

      // Draw landed cells
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          if (grid[r][c] === -1) continue;
          const dist = Math.max(Math.abs(c - mCol), Math.abs(r - mRow));
          drawCell(c * STEP, r * STEP, grid[r][c], dist <= 4);
        }
      }

      // Update and draw falling pieces
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];

        if (!prefersReduced) {
          p.row += p.speed;

          // Rotate periodically
          p.rotateTimer++;
          if (p.rotateTimer >= p.rotateInterval) {
            p.rotateTimer = 0;
            const nextRot = (p.rotation + 1) % 4;
            if (!collides(p, 0, 0, nextRot)) {
              p.rotation = nextRot;
            }
          }
        }

        // Check landing
        if (collides(p, 1, 0)) {
          lockPiece(p);
          pieces.splice(i, 1);
          clearRows();
          continue;
        }

        // Draw the piece
        const shape = getShape(p);
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (!shape[r][c]) continue;
            const px = (p.col + c) * STEP;
            const py = Math.floor(p.row + r) * STEP;
            if (py < 0) continue;
            const dist = Math.max(
              Math.abs(p.col + c - mCol),
              Math.abs(Math.floor(p.row + r) - mRow)
            );
            drawCell(px, py, p.shape, dist <= 4);
          }
        }
      }

      // Spawn
      if (!prefersReduced && frameCount % 80 === 0 && pieces.length < 8) {
        pieces.push(spawnPiece());
      }

      // Prevent grid from filling up too high — clear top rows if stacked
      let topFilled = 0;
      for (let r = 0; r < 3; r++) {
        if (grid[r].some((c) => c !== -1)) topFilled++;
      }
      if (topFilled >= 2) {
        // Clear bottom 3 rows to make room
        for (let r = gridRows - 1; r >= gridRows - 3; r--) {
          grid[r].fill(-1);
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
