type Experience = {
  id: string;
  company: string;
  role: string;
  period: string;
  description: string;
  tech: string[];
};

export const experience: Experience[] = [
  {
    id: "nettbureau",
    company: "Nettbureau",
    role: "Full-stack Developer",
    period: "Oct 2021 – Present",
    description:
      "Building and maintaining web applications, APIs, and internal tools. Working across the full stack with modern JavaScript/TypeScript tooling.",
    tech: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL"],
  },
  {
    id: "iod",
    company: "Indre Østfold Data IKS",
    role: "IT Consultant",
    period: "Aug 2015 – Jul 2017",
    description:
      "Provided IT support and infrastructure management for municipal organizations. Managed servers, networks, and end-user systems.",
    tech: [
      "Windows Server",
      "Active Directory",
      "PowerShell",
      "Networking",
      "Helpdesk",
    ],
  },
];
