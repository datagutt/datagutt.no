export type TechTag = {
  name: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  image: string;
  width?: number;
  height?: number;
  link?: string;
  poweredBy?: TechTag[];
};

/** Stable ids are referenced from dialogue, e.g. project_desc("irlserver"). */
export const projects: Project[] = [
  {
    id: "portfolio",
    name: "Portfolio",
    description: "My personal portfolio",
    image: "/images/avatar.png",
    link: "https://datagutt.no",
    width: 480,
    height: 288,
    poweredBy: [
      { name: "Next.js" },
      { name: "React" },
      { name: "GSAP" },
      { name: "Tailwind" },
      { name: "Geist" },
    ],
  },
  {
    id: "donate-chat",
    name: "Donate.chat",
    description:
      "Development of payment solutions for live streamers and influencers, including support for Vipps and card payments, as well as integrations with platforms such as Twitch, YouTube, Streamelements and Streamlabs.",
    image: "/images/projects/donate.png",
    link: "https://donate.chat",
    width: 480,
    height: 288,
    poweredBy: [
      { name: "Next.js" },
      { name: "React" },
      { name: "Vipps" },
      { name: "Stripe" },
      { name: "Twitch" },
    ],
  },
  {
    id: "irlserver",
    name: "IRLServer",
    description:
      "Simplifying IRL streaming by providing software and services that allow for stable live streams from anywhere in the world by bonding multiple network connections.",
    image: "/images/projects/irlserver.webp",
    link: "https://irlserver.com",
    width: 480,
    height: 288,
    poweredBy: [
      { name: "Node.js" },
      { name: "Rust" },
      { name: "SRT" },
      { name: "RIST" },
      { name: "RTMP" },
      { name: "Docker" },
    ],
  },
  {
    id: "guac",
    name: "Guac.tv",
    description:
      "Guac is a fully-featured live streaming platform. Including everything from live streaming, VODs and clips to a chat with custom emotes and moderation tools.",
    image: "/images/projects/guac.png",
    link: "https://guac.tv",
    width: 480,
    height: 288,
    poweredBy: [
      { name: "Next.js" },
      { name: "React" },
      { name: "Node.js" },
      { name: "FFmpeg" },
      { name: "WebSocket" },
    ],
  },
];
