// M2.9's "done when": every piece of content is mentioned by at least one line of dialogue,
// so nothing on the old site is missing from the game.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { experience } from "../../content/experience";
import { profile } from "../../content/profile";
import { projects } from "../../content/projects";
import { skillCategories } from "../../content/skills";
import { socials } from "../../content/socials";

const dir = path.join(__dirname, "ink");
const source = fs
	.readdirSync(dir)
	.filter((f) => f.endsWith(".ink"))
	.map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
	.join("\n");

const mentions = (pattern: string) => source.includes(pattern);

describe("dialogue covers all content", () => {
	it.each(projects.map((p) => p.id))("project %s: description and link", (id) => {
		expect(mentions(`project_desc("${id}")`)).toBe(true);
		const project = projects.find((p) => p.id === id)!;
		// The portfolio's link is this site; everything else must be openable.
		if (project.link && id !== "portfolio") expect(mentions(`# link: project ${id}`)).toBe(true);
	});

	it.each(experience.map((j) => j.id))("job %s: role, period, description, tech", (id) => {
		for (const fn of ["job_role", "job_period", "job_desc", "job_tech"]) expect(mentions(`${fn}("${id}")`), fn).toBe(true);
	});

	it.each(skillCategories.map((c) => c.name))("skill category %s", (name) => {
		expect(mentions(`skills("${name}")`)).toBe(true);
	});

	it.each(socials.map((s) => s.id))("social %s is linked", (id) => {
		expect(mentions(`# link: social ${id}`)).toBe(true);
	});

	it("profile, about, contact and live data", () => {
		profile.about.forEach((_, i) => expect(mentions(`about(${i})`), `about(${i})`).toBe(true));
		for (const field of ["name", "tagline", "email", "contactPitch"]) expect(mentions(`profile("${field}")`), field).toBe(true);
		expect(mentions("# link: email")).toBe(true);
		for (const fn of ["repo_name(", "repo_desc(", "contributions_total()"]) expect(mentions(fn), fn).toBe(true);
		for (const stat of ["public_repos", "total_stars", "followers", "years_coding"]) expect(mentions(`stat("${stat}")`), stat).toBe(true);
	});
});
