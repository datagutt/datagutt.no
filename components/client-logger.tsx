"use client";
import { useEffect } from "react";

const msg = `
Hi,
I left source maps on for this project, so you can see the source code.
You can also see the source code on GitHub:
https://github.com/datagutt/datagutt.no
I hope you enjoy it!
`.trim();
const logStyles = [
  "font-size: 14px",
  'font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  "color: #1dc672",
  "background-color: #000",
  "padding: 10px",
].join(";");
export function ClientLogger() {
  useEffect(() => {
    const run = () => console.info(`%c${msg}`, logStyles);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run);
      return () => cancelIdleCallback(id);
    }
    const timeout = setTimeout(run, 0);
    return () => clearTimeout(timeout);
  }, []);

  return null;
}
