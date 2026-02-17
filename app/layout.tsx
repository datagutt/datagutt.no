import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import {
  GeistPixelSquare,
  GeistPixelGrid,
  GeistPixelCircle,
  GeistPixelTriangle,
  GeistPixelLine,
} from "geist/font/pixel";

export const metadata: Metadata = {
  title: "datagutt",
  description: "Hi! I'm Thomas, a full-stack web developer from Norway.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelCircle.variable} ${GeistPixelTriangle.variable} ${GeistPixelLine.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
