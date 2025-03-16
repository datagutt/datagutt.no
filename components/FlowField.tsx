"use client";
import * as React from "react";
import { randomInt, TAU, randomElement } from "@/app/utils/math";
import { mkSimplexNoise, SimplexNoise } from "@spissvinkel/simplex-noise";
import { point, setupCanvas } from "@/app/utils/canvas";

// Inspired by https://github.com/FyraLabs/homepage

interface Particle {
  x: number;
  y: number;
  color: string;
}

let noiseGen = mkSimplexNoise(Math.random);
const noiseSc = 0.01 / 2;
const defaultColors = [
  "#f0fdf6",
  "#dbfdec",
  "#b9f9d9",
  "#83f2ba",
  "#46e294",
  "#1dc672",
  "#12a75d",
  "#12834b",
  "#14673e",
  "#125536",
  "#042f1c",
];

const draw = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  particles: Particle[],
  frame: number,
) => {
  if (frame % 4 == 0) {
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.globalAlpha = 1;

  particles.forEach((p) => {
    ctx.fillStyle = p.color;

    const noise = noiseGen.noise3D(
      p.x * noiseSc,
      p.y * noiseSc,
      frame * noiseSc * noiseSc,
    );

    const a = noise * TAU;
    p.x += Math.cos(a) * 1.5;
    p.y += Math.sin(a) * 1.5;

    // If particle is outside of canvas, randomize it's position
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
      p.x = randomInt(canvas.width);
      p.y = randomInt(canvas.height);
    }

    point(ctx, p.x, p.y, 1);
  });

  requestAnimationFrame(() => draw(ctx, canvas, particles, frame + 1));
};

const initCanvas = (canvas: HTMLCanvasElement, color?: string[]) => {
  const ctx = setupCanvas(canvas);

  const particles: Particle[] = Array(1000)
    .fill(0)
    .map(() => ({
      x: randomInt(canvas.width),
      y: randomInt(canvas.height),
      color: randomElement(color || defaultColors),
    }));

  draw(ctx, canvas, particles, 0);
};

const random = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min)) + min;

interface FlowFieldProps {
  style?: React.CSSProperties;
  className?: string;
  color?: string[];
}

const FlowField = ({ style, className, color }: FlowFieldProps) => {
  const canvasHolder = React.useRef<HTMLDivElement>(
    null,
  ) as React.RefObject<HTMLDivElement>;
  const canvas = React.useRef<HTMLCanvasElement>(
    null,
  ) as React.RefObject<HTMLCanvasElement>;
  const tickTimeoutId = React.useRef<number | undefined>(undefined);

  const canvasNoise = () => {
    noiseGen = mkSimplexNoise(Math.random);
  };

  const windowResize = () => {
    setupCanvas(canvas.current);
  };

  const handleTick = () => {
    const nextTickAt = random(6000, 8000);
    tickTimeoutId.current = window.setTimeout(() => {
      canvasNoise();
      handleTick();
    }, nextTickAt);
  };

  React.useEffect(() => {
    if (canvasHolder.current && canvas.current) {
      initCanvas(canvas.current, color);
      canvasHolder.current.addEventListener("click", canvasNoise);
      canvas.current.addEventListener("click", canvasNoise);
      handleTick();

      window.addEventListener("resize", windowResize);
    }

    return () => {
      if (canvasHolder.current && canvas.current) {
        canvasHolder.current.removeEventListener("click", canvasNoise);
        canvas.current.removeEventListener("click", canvasNoise);
        clearTimeout(tickTimeoutId.current);

        window.removeEventListener("resize", windowResize);
      }
    };
  }, [canvas]);

  return (
    <div
      ref={canvasHolder}
      id="flow-field-background"
      className="absolute left-0 top-0 min-w-full max-w-full min-h-full max-h-full"
    >
      <canvas ref={canvas} style={style} className={className} />
    </div>
  );
};

export default FlowField;
