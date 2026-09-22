// Walks the compiled Ink story one beat at a time for the dialogue UI.
import { Story } from "inkjs";
import { bindExternals, type ExternalContext } from "./externals";

export type Beat =
	| { type: "line"; text: string; tags: string[]; speaker: string | null }
	| { type: "choices"; choices: string[] }
	| { type: "end" };

export class DialogueRunner {
	private readonly story: InstanceType<typeof Story>;

	constructor(json: string | object, ctx: ExternalContext, savedState?: string) {
		this.story = new Story(typeof json === "string" ? json : JSON.stringify(json));
		bindExternals(this.story as never, ctx);
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

	/** Visit counts and variables, for the save file. */
	saveState(): string {
		return this.story.state.ToJson();
	}
}
