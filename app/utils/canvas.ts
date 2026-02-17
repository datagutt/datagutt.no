"use client";
import { TAU } from "./math";

export const setupCanvas = (canvas: HTMLCanvasElement) => {
  // Cap DPR to reduce fill-rate pressure on high-density displays.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return ctx;
};

export const point = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
};
