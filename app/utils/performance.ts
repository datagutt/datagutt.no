"use client";

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithHints = Navigator & {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
};

export function getAdaptiveCanvasFrameInterval(prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return 1000 / 20;
  }

  const nav = navigator as NavigatorWithHints;
  const connection = nav.connection;
  const effectiveType = connection?.effectiveType;
  const saveData = connection?.saveData === true;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;

  let fps = 45;

  if (saveData) fps = Math.min(fps, 24);
  if (effectiveType === "slow-2g" || effectiveType === "2g") fps = Math.min(fps, 20);
  if (effectiveType === "3g") fps = Math.min(fps, 24);
  if (cores <= 4) fps = Math.min(fps, 30);
  if (memory <= 4) fps = Math.min(fps, 30);
  if (cores <= 2 || memory <= 2) fps = Math.min(fps, 24);

  return 1000 / fps;
}
