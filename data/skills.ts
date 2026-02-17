type SkillCategory = {
  name: string;
  skills: string[];
};

export const skillCategories: SkillCategory[] = [
  {
    name: "Languages",
    skills: ["TypeScript", "JavaScript", "Rust", "PHP", "HTML", "CSS", "SQL"],
  },
  {
    name: "Frameworks",
    skills: ["React", "Next.js", "Node.js", "Tailwind CSS", "GSAP"],
  },
  {
    name: "Cloud & DevOps",
    skills: [
      "Vercel",
      "AWS",
      "Cloudflare",
      "GitHub Actions",
      "Docker",
      "Terraform",
    ],
  },
  {
    name: "Tools",
    skills: ["Git", "PostgreSQL", "MariaDB", "Redis", "Linux", "WebSocket"],
  },
  {
    name: "Video & Streaming Tech",
    skills: ["FFmpeg", "SRT", "RIST", "RTMP", "OBS Studio", "GStreamer"],
  },
  {
    name: "Payments",
    skills: ["Stripe", "Vipps"],
  },
];
