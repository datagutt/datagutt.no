import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const mondwest = localFont({
  src: "../fonts/PPMondwest-Regular.otf",
  display: "swap",
  variable: "--font-mond",
});

const neuebit = localFont({
  src: "../fonts/PPNeueBit-Bold.otf",
  display: "swap",
  variable: "--font-bit",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

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
      suppressHydrationWarning
      className={`${mondwest.variable} ${neuebit.variable} ${inter.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
