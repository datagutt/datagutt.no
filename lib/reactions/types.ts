export const REACTION_TYPES = [
	"ripple",
	"heart",
	"star",
	"fire",
	"skull",
	"sparkle",
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_SECTION_IDS = [
	"hero",
	"portfolio",
	"about",
	"techstack",
	"experience",
	"opensource",
	"stats",
	"contact",
] as const;

export type ReactionSectionId = (typeof REACTION_SECTION_IDS)[number];

export type ReactionPayload = {
	sectionId: ReactionSectionId;
	normalizedX: number;
	normalizedY: number;
	type: ReactionType;
};

export type ReactionEvent = ReactionPayload & {
	id: string;
	t: number;
};
