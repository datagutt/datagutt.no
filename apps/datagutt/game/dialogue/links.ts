// `# link:` tags in Ink (docs/PLAN.md M2.7): a line can offer to open something.
//   # link: project irlserver     the project's site
//   # link: social github         a social profile
//   # link: email                 a mail to datagutt
// The build validates the ids; the game resolves them to a URL and a short label.
// Imported by Node build scripts too, hence the explicit .ts extensions.
import { profile } from "../../content/profile.ts";
import { projects } from "../../content/projects.ts";
import { socials } from "../../content/socials.ts";

export type Link = { url: string; label: string };

const LINK_TAG = /^link:\s*([\w-]+)(?:\s+([\w-]+))?\s*$/;

/** Parses a tag; returns null for other tags, or an error string for a bad link tag. */
export function parseLinkTag(tag: string): { kind: string; id?: string } | null {
	const m = LINK_TAG.exec(tag.trim());
	return m ? { kind: m[1], id: m[2] } : null;
}

const hostOf = (url: string) => {
	try {
		return new URL(url).host.replace(/^www\./, "");
	} catch {
		return url;
	}
};

/** Resolve a link tag against content, or explain why it cannot be resolved. */
export function resolveLink(tag: string): Link | { error: string } | null {
	const parsed = parseLinkTag(tag);
	if (!parsed) return null;
	const { kind, id } = parsed;
	if (kind === "email") return { url: `mailto:${profile.email}`, label: profile.email };
	if (kind === "project") {
		const project = projects.find((p) => p.id === id);
		if (!project?.link) return { error: `link: project "${id}" has no link. Valid: ${projects.filter((p) => p.link).map((p) => p.id).join(", ")}` };
		return { url: project.link, label: hostOf(project.link) };
	}
	if (kind === "social") {
		const social = socials.find((s) => s.id === id);
		if (!social) return { error: `link: unknown social "${id}". Valid: ${socials.map((s) => s.id).join(", ")}` };
		return { url: social.url, label: `${social.label} (${hostOf(social.url)})` };
	}
	return { error: `link: unknown kind "${kind}". Use project, social or email` };
}
