import { describe, expect, it } from "vitest";
import { credits } from "./credits";
import { experience } from "./experience";
import { places, placeFromSearch } from "./places";
import { projects } from "./projects";

describe("content", () => {
	it("gives every project and job exactly one place in town", () => {
		const refs = places.flatMap((p) => p.presents as readonly { kind: string; id?: string }[]);
		for (const project of projects) {
			expect(refs.filter((r) => r.kind === "project" && r.id === project.id), project.id).toHaveLength(1);
		}
		for (const job of experience) {
			expect(refs.filter((r) => r.kind === "experience" && r.id === job.id), job.id).toHaveLength(1);
		}
		for (const kind of ["profile", "skills", "repos", "stats", "contact"]) {
			expect(refs.some((r) => r.kind === kind), kind).toBe(true);
		}
	});

	it("only references content that exists", () => {
		for (const p of places) {
			for (const ref of p.presents as readonly { kind: string; id?: string }[]) {
				if (ref.kind === "project") expect(projects.map((x) => x.id)).toContain(ref.id);
				if (ref.kind === "experience") expect(experience.map((x) => x.id)).toContain(ref.id);
			}
		}
	});

	it("uses unique ids", () => {
		for (const list of [places, projects, experience]) {
			const ids = list.map((x) => x.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});
});

describe("credits", () => {
	// The art licence requires crediting LimeZu wherever the credits show (START menu,
	// finale roll, Journal footer: all read this module).
	it("credit LimeZu for the art", () => {
		expect(credits.sections.find((s) => s.heading === "Art")?.lines.join(" ")).toMatch(/LimeZu/);
	});
});

describe("placeFromSearch", () => {
	it("accepts known places only", () => {
		expect(placeFromSearch("?at=office")?.id).toBe("office");
		expect(placeFromSearch("?at=Office")?.id).toBe("office");
		expect(placeFromSearch("?at=library")?.id).toBe("library");
		expect(placeFromSearch("?at=nowhere")).toBeNull();
		expect(placeFromSearch("?at=constructor")).toBeNull();
		expect(placeFromSearch("")).toBeNull();
	});
});
