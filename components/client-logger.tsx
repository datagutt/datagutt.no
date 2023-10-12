"use client";
const msg = `
Hi,
I left source maps on for this project, so you can see the source code.
You can also see the source code on GitHub:
https://github.com/datagutt/datagutt
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
  console.info(`%c${msg}`, logStyles);
  return null;
}
