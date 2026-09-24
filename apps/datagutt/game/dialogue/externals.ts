// Every function dialogue can call to read content or live data (docs/game/DESIGN.md §11).
// The build turns this registry into Ink EXTERNAL declarations and validates literal ids
// in the .ink sources against it; the game binds the implementations at runtime.
// Imported by Node build scripts too, hence the explicit .ts extensions.
import { experience } from "../../content/experience.ts";
import type { WorldState } from "@datagutt/kai-live";
import { places } from "../../content/places.ts";
import { profile } from "../../content/profile.ts";
import { projects } from "../../content/projects.ts";
import { skillCategories } from "../../content/skills.ts";
import { socials } from "../../content/socials.ts";
import { UNLOCK_IDS, type UnlockId } from "../progress/unlockIds.ts";

/** What kind of value an external's first argument is, so literal ids can be checked. */
export type ArgKind = "project" | "job" | "social" | "profileField" | "stat" | "skillCategory" | "place" | "unlock" | "index" | "none";

const PROFILE_FIELDS = ["name", "firstName", "handle", "role", "tagline", "location", "email", "contactPitch"] as const;
const STAT_FIELDS = ["public_repos", "followers", "total_stars", "years_coding"] as const;

export type ExternalSpec = { params: string[]; arg: ArgKind; doc: string };

export const EXTERNALS = {
	profile: { params: ["field"], arg: "profileField", doc: "A profile field, e.g. profile(\"tagline\")" },
	about: { params: ["index"], arg: "index", doc: "About paragraph by index (0-based)" },
	project_name: { params: ["id"], arg: "project", doc: "Project name" },
	project_desc: { params: ["id"], arg: "project", doc: "Project description" },
	project_link: { params: ["id"], arg: "project", doc: "Project URL" },
	project_tech: { params: ["id"], arg: "project", doc: "Comma-separated tech list" },
	job_company: { params: ["id"], arg: "job", doc: "Employer name" },
	job_role: { params: ["id"], arg: "job", doc: "Role title" },
	job_period: { params: ["id"], arg: "job", doc: "Period, e.g. Oct 2021 – Present" },
	job_desc: { params: ["id"], arg: "job", doc: "What the job involved" },
	job_tech: { params: ["id"], arg: "job", doc: "Comma-separated tech list" },
	skills: { params: ["category"], arg: "skillCategory", doc: "Comma-separated skills in a category" },
	social_url: { params: ["id"], arg: "social", doc: "URL of a social profile" },
	repo_count: { params: [], arg: "none", doc: "Number of pinned repos (live)" },
	repo_name: { params: ["index"], arg: "index", doc: "Pinned repo name by index (live)" },
	repo_desc: { params: ["index"], arg: "index", doc: "Pinned repo description by index (live)" },
	repo_lang: { params: ["index"], arg: "index", doc: "Pinned repo language by index (live)" },
	repo_stars: { params: ["index"], arg: "index", doc: "Pinned repo stars by index (live)" },
	stat: { params: ["name"], arg: "stat", doc: "GitHub stat (live): public_repos, followers, total_stars, years_coding" },
	contributions_total: { params: [], arg: "none", doc: "Contributions in the last year (live)" },
	has_stamp: { params: ["place"], arg: "place", doc: "Whether the player has that place's passport stamp" },
	unlocked: { params: ["name"], arg: "unlock", doc: "Whether a locked way is open, e.g. unlocked(\"passport\") once every stamp is in (content/unlocks.json)" },
	lanyard_activity: { params: [], arg: "none", doc: "What Thomas is up to right now in his own words, or \"\" (live, content/presence.json lines)" },
} as const satisfies Record<string, ExternalSpec>;

export type ExternalName = keyof typeof EXTERNALS;

/** Valid literal values for an argument kind, or null when not checkable statically. */
export function validIds(kind: ArgKind): readonly string[] | null {
	switch (kind) {
		case "project":
			return projects.map((p) => p.id);
		case "job":
			return experience.map((j) => j.id);
		case "social":
			return socials.map((s) => s.id);
		case "profileField":
			return PROFILE_FIELDS;
		case "stat":
			return STAT_FIELDS;
		case "skillCategory":
			return skillCategories.map((c) => c.name);
		case "place":
			return places.map((p) => p.id);
		case "unlock":
			return UNLOCK_IDS;
		case "index":
		case "none":
			return null;
	}
}

/** Ink source declaring every external, prepended to the story at build time. */
export function externalDeclarations(): string {
	return Object.entries(EXTERNALS)
		.map(([name, spec]) => `EXTERNAL ${name}(${spec.params.join(", ")})`)
		.join("\n");
}

export type ExternalContext = {
	world: WorldState;
	hasStamp(place: string): boolean;
	isUnlocked(name: UnlockId): boolean;
};

const find = <T extends { id: string }>(list: readonly T[], id: string, what: string): T => {
	const found = list.find((x) => x.id === id);
	if (!found) throw new Error(`Dialogue asked for unknown ${what} "${id}"`);
	return found;
};

/** "my home on the internet" -> "My home on the internet." (empty stays empty). */
export function asSentence(text: string): string {
	const t = text.trim();
	if (!t) return "";
	const capital = t.charAt(0).toUpperCase() + t.slice(1);
	return /[.!?…)]$/.test(capital) ? capital : `${capital}.`;
}

/**
 * Fjord Town's dialogue functions, reading the content and `ctx`. `lanyard_activity`
 * comes from the presence plugin.
 */
export function fjordExternals(ctx: ExternalContext): Record<Exclude<ExternalName, "lanyard_activity">, (...args: never[]) => unknown> {
	const repo = (i: number) => ctx.world.repos[Math.trunc(i)];
	const impl: Record<Exclude<ExternalName, "lanyard_activity">, (...args: never[]) => unknown> = {
		profile: (field: string) => String(profile[field as (typeof PROFILE_FIELDS)[number]] ?? ""),
		about: (i: number) => profile.about[Math.trunc(i)] ?? "",
		project_name: (id: string) => find(projects, id, "project").name,
		project_desc: (id: string) => find(projects, id, "project").description ?? "",
		project_link: (id: string) => find(projects, id, "project").link ?? "",
		project_tech: (id: string) => (find(projects, id, "project").poweredBy ?? []).map((t) => t.name).join(", "),
		job_company: (id: string) => find(experience, id, "job").company,
		job_role: (id: string) => find(experience, id, "job").role,
		job_period: (id: string) => find(experience, id, "job").period,
		job_desc: (id: string) => find(experience, id, "job").description,
		job_tech: (id: string) => find(experience, id, "job").tech.join(", "),
		skills: (category: string) => skillCategories.find((c) => c.name === category)?.skills.join(", ") ?? "",
		social_url: (id: string) => find(socials, id, "social").url,
		repo_count: () => ctx.world.repos.length,
		repo_name: (i: number) => repo(i)?.name ?? "",
		// GitHub descriptions often lack a full stop; dialogue reads them as sentences.
		repo_desc: (i: number) => asSentence(repo(i)?.description ?? ""),
		repo_lang: (i: number) => repo(i)?.language ?? "",
		repo_stars: (i: number) => repo(i)?.stars ?? 0,
		stat: (name: string) => ctx.world.stats[name as (typeof STAT_FIELDS)[number]] ?? 0,
		contributions_total: () => ctx.world.contributions.reduce((sum, d) => sum + d.count, 0),
		has_stamp: (place: string) => ctx.hasStamp(place),
		unlocked: (name: string) => ctx.isUnlocked(name as UnlockId),
	};
	return impl;
}
