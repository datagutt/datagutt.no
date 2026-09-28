import { content } from "./index.ts";

export type Project = (typeof content.projects)[number];
export type TechTag = NonNullable<Project["poweredBy"]>[number];

/** content/projects/*.md. Stable ids are referenced from dialogue, e.g. project_desc("irlserver"). */
export const projects: Project[] = content.projects;
