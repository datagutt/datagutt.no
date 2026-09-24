import "./globals.css";
import type { Metadata } from "next";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import { GeistSans } from "geist/font/sans";
import { GeistPixelSquare } from "geist/font/pixel";

const description = "Hi! I'm Thomas, a full-stack web developer from Norway. My portfolio is a small pixel-art town on a fjord: walk around, talk to the locals, find my projects.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "datagutt · Fjord Town", template: "%s · datagutt" },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "datagutt",
    title: "datagutt · Fjord Town",
    description,
    url: "/",
    locale: "en_GB",
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", creator: "@datagutt" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistPixelSquare.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
