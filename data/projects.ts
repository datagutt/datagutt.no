type Project = {
  id: string;
  name: string;
  description?: string;
  image: string;
  width?: number;
  height?: number;
  link?: string;
};

/* TODO: Add screenshots and a powered by icon-list */

export const projects: Project[] = [
  {
    id: "1",
    name: "Portfolio",
    description: "My personal portfolio",
    image: "/images/avatar.png",
    link: "https://datagutt.no",
    width: 480,
    height: 288,
  },
  {
    id: "2",
    name: "Donate.chat",
    description:
      "Development of payment solutions for live streamers and influencers, including support for Vipps and card payments, as well as integrations with platforms such as Twitch, YouTube, Streamelements and Streamlabs.",
    image: "/images/projects/givetip.webp",
    link: "https://donate.chat",
    width: 480,
    height: 288,
  },
  {
    id: "4",
    name: "IRLServer",
    description:
      "Simplifying IRL streaming by providing software and services that allow for stable live streams from anywhere in the world by bonding multiple network connections.",
    image: "/images/projects/irlserver.webp",
    link: "https://irlserver.com",
    width: 480,
    height: 288,
  },
  {
    id: "3",
    name: "Guac.tv",
    description:
      "Guac is a fully-featured live streaming platform. Including everything from live streaming, VODs and clips to a chat with custom emotes and moderation tools.",
    image: "/images/projects/guac.png",
    link: "https://guac.tv",
    width: 480,
    height: 288,
  },
];
