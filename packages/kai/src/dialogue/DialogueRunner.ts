// Walks the compiled Ink story one beat at a time for the dialogue UI.
import { Story } from "inkjs";

/** Implementations of the story's EXTERNAL functions, by name. */
export type ExternalFunctions = Record<string, (...args: never[]) => unknown>;

export type Beat =
	| { type: "line"; text: string; tags: string[]; speaker: string | null }
	| { type: "choices"; choices: string[] }
	| { type: "end" };

export class DialogueRunner {
	private readonly story: InstanceType<typeof Story>;

	constructor(json: string | object, externals: ExternalFunctions, savedState?: string) {
		this.story = new Story(typeof json === "string" ? json : JSON.stringify(json));
		// Lookahead-safe: they only read, so Ink may call them while looking ahead.
		for (const [name, fn] of Object.entries(externals)) this.story.BindExternalFunction(name, fn, true);
		if (savedState) {
			try {
				this.story.state.LoadJson(savedState);
			} catch {
				// A save from an older version of the dialogue: start its counters fresh.
			}
		}
	}

	/** Jump to an NPC's knot. */
	start(knot: string): void {
		this.story.ChoosePathString(knot);
	}

	next(): Beat {
		while (this.story.canContinue) {
			const text = (this.story.Continue() ?? "").trim();
			const tags = this.story.currentTags ?? [];
			if (!text) continue;
			const speakerTag = tags.find((t) => t.startsWith("speaker:"));
			return { type: "line", text, tags, speaker: speakerTag ? speakerTag.slice(8).trim() : null };
		}
		const choices = this.story.currentChoices.map((c) => c.text);
		return choices.length ? { type: "choices", choices } : { type: "end" };
	}

	choose(index: number): void {
		this.story.ChooseChoiceIndex(index);
	}

	/** How often a knot has been visited, over the whole game. */
	visits(knot: string): number {
		return this.story.state.VisitCountAtPathString(knot) ?? 0;
	}

	/** Visit counts and variables, for the save file. */
	saveState(): string {
		return this.story.state.ToJson();
	}
}
