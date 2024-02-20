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
    name: "GiveTip.to",
    description:
      "GiveTip streamlines Norwegian donations for streamers, supporting Vipps and providing alerts on platforms like Twitch and YouTube through StreamElements and StreamLabs integrations.",
    image: "/images/projects/givetip.webp",
    link: "https://givetip.to",
    width: 480,
    height: 288,
  },
  {
    id: "3",
    name: "Guac.tv",
    description:
      "Guac is a fully-featured live streaming platform. Yes, that includes everything from live streaming, VODs and clips to a chat with custom emotes and moderation tools.",
    image: "/images/projects/guac.png",
    link: "https://givetip.to",
    width: 480,
    height: 288,
  },
  {
    id: "4",
    name: "IRLServer",
    description:
      "IRLServer is a system for streaming IRL content. It includes a web interface for managing your stream, server software for streaming and automatic scene switching.",
    image: "/images/projects/irlserver.webp",
    link: "https://irlserver.com",
    width: 480,
    height: 288,
  },
];
