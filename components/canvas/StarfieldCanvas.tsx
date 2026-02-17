"use client";

import { useEffect, useRef } from "react";
import { setupCanvas } from "../../app/utils/canvas";
import { getAdaptiveCanvasFrameInterval } from "../../app/utils/performance";
import { useResizeKey } from "../../hooks/useResizeKey";

const CELL = 4;

// Pixel art invader sprites (5x5 grids, 1 = filled)
const SPRITES = [
  // Classic invader
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
  ],
  // UFO
  [
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  // Small ship
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 1, 0],
  ],
  // Asteroid
  [
    [0, 1, 1, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
];

type Star = {
  x: number;
  y: number;
  speed: number;
  brightness: number;
  size: number;
  twinkleOffset: number;
};

type Sprite = {
  x: number;
  y: number;
  speed: number;
  pattern: number[][];
  color: string;
  scale: number;
};

const GREENS = [
  "rgba(18,85,54,",
  "rgba(18,131,75,",
  "rgba(29,198,114,",
  "rgba(70,226,148,",
];

type Props = {
  paused?: boolean;
  mouseContainerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
};

export default function StarfieldCanvas({ paused = false, mouseContainerRef, className }: Props) {
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

    // 3 parallax layers of stars
    const layers: Star[][] = [[], [], []];
    const speeds = [0.15, 0.4, 0.8];
    const counts = [80, 50, 25];
    const sizes = [2, 3, 4];

    for (let l = 0; l < 3; l++) {
      for (let i = 0; i < counts[l]; i++) {
        layers[l].push({
          x: Math.random() * w,
          y: Math.random() * h,
          speed: speeds[l] + Math.random() * 0.2,
          brightness: 0.1 + Math.random() * 0.4 + l * 0.15,
          size: sizes[l],
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    // Sprites
    const sprites: Sprite[] = [];
    const spawnSprite = () => {
      sprites.push({
        x: w + 50,
        y: 50 + Math.random() * (h - 100),
        speed: 0.3 + Math.random() * 0.5,
        pattern: SPRITES[Math.floor(Math.random() * SPRITES.length)],
        color: GREENS[Math.floor(Math.random() * GREENS.length)],
        scale: 1 + Math.floor(Math.random() * 2),
      });
    };

    // Start with a couple
    spawnSprite();
    spawnSprite();

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
    const FRAME_INTERVAL = getAdaptiveCanvasFrameInterval(prefersReduced);
    let lastFrameTime = 0;
    let frameCount = 0;

    const draw = (timestamp: number) => {
      if (pausedRef.current) return;

      if (timestamp - lastFrameTime < FRAME_INTERVAL) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = timestamp;

      ctx.clearRect(0, 0, w, h);

      const time = frameCount * 0.02;
      const mouseRadiusSq = 120 * 120;

      // Stars
      for (let l = 0; l < 3; l++) {
        for (const star of layers[l]) {
          if (!prefersReduced) {
            star.x -= star.speed;
            if (star.x < -10) {
              star.x = w + 10;
              star.y = Math.random() * h;
            }
          }

          // Twinkle
          const twinkle = Math.sin(time * 2 + star.twinkleOffset);
          let alpha = star.brightness + twinkle * 0.1;

          // Mouse brightens nearby stars
          const dx = mouse.x - star.x;
          const dy = mouse.y - star.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < mouseRadiusSq) {
            alpha += (1 - distSq / mouseRadiusSq) * 0.5;
          }

          alpha = Math.max(0, Math.min(1, alpha));
          ctx.fillStyle = `rgba(29,198,114,${alpha})`;

          // Pixel-perfect square stars
          const s = star.size;
          ctx.fillRect(
            Math.floor(star.x),
            Math.floor(star.y),
            s,
            s
          );
        }
      }

      // Sprites
      for (let i = sprites.length - 1; i >= 0; i--) {
        const sp = sprites[i];
        if (!prefersReduced) {
          sp.x -= sp.speed;
        }

        if (sp.x < -60) {
          sprites.splice(i, 1);
          continue;
        }

        // Draw pixel sprite
        const px = sp.scale * CELL;
        for (let sy = 0; sy < sp.pattern.length; sy++) {
          for (let sx = 0; sx < sp.pattern[sy].length; sx++) {
            if (sp.pattern[sy][sx]) {
              const drawX = Math.floor(sp.x + sx * px);
              const drawY = Math.floor(sp.y + sy * px);

              // Mouse proximity
              const dx = mouse.x - drawX;
              const dy = mouse.y - drawY;
              const distSq = dx * dx + dy * dy;
              const alpha = distSq < 100 * 100 ? 0.9 : 0.4;

              ctx.fillStyle = sp.color + alpha + ")";
              ctx.fillRect(drawX, drawY, px - 1, px - 1);
            }
          }
        }
      }

      // Spawn sprites occasionally
      if (!prefersReduced && frameCount % 300 === 0 && sprites.length < 5) {
        spawnSprite();
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
