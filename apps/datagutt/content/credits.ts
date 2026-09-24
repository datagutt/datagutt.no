// The credits: the START menu's Credits page and the finale's roll both read them.
import { profile } from "./profile";
import { projects } from "./projects";

export type CreditSection = { heading: string; lines: string[] };

const stack = projects.find((p) => p.id === "portfolio")?.poweredBy?.map((t) => t.name) ?? [];

export const credits = {
	title: "Fjord Town",
	byline: `A portfolio by ${profile.name}`,
	sections: [
		{ heading: "Built with", lines: [stack.join(", ")] },
		{ heading: "Art", lines: ["LimeZu (limezu.itch.io)", "Modern Exteriors, Modern Interiors,", "Modern Office, Modern User Interface"] },
		{ heading: "Type", lines: ["Geist Pixel by Vercel", "(SIL Open Font License)"] },
		// CC BY 4.0 asks for the title, the author, the source and the licence (links in CREDITS.md).
		{ heading: "Music", lines: ["Towball's Crossing: Deluxe!", "by Towball (towball.itch.io),", "CC BY 4.0"] },
		{ heading: "Sound", lines: ["Made in code with Web Audio"] },
		{ heading: "Code", lines: ["GPL-3.0 on GitHub", "datagutt/datagutt.no"] },
	] satisfies CreditSection[],
	thanks: "Thanks for visiting.",
};
