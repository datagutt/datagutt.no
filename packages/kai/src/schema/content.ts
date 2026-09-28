// Content collections: the resource files a game keeps in `content/`, each checked by a
// Zod schema when `kai content` compiles them into one bundle. The engine defines the
// collections it reads itself; a game adds its own beside them.
import { z } from "zod";

/** `content/<name>.json`: one JSON object. `$schema` is dropped before validation. */
export type JsonCollection<S extends z.ZodType = z.ZodType> = { kind: "json"; schema: S };

/**
 * `content/<name>/*.md`: one entry per file, in file name order. A file named
 * "10-portfolio.md" is the entry with id "portfolio": the number only orders the files.
 * The YAML frontmatter holds the fields and the text below it goes to `body`.
 */
export type MarkdownCollection<S extends z.ZodObject = z.ZodObject> = { kind: "markdown"; schema: S; body: string };

export type Collection = JsonCollection | MarkdownCollection;
export type Collections = Record<string, Collection>;

export const json = <S extends z.ZodType>(schema: S): JsonCollection<S> => ({ kind: "json", schema });

export const markdown = <S extends z.ZodObject>(schema: S, options: { body: keyof z.input<S> & string }): MarkdownCollection<S> => ({
	kind: "markdown",
	schema,
	body: options.body,
});

/** The compiled content of a set of collections, as the game and the site read it. */
export type ContentOf<C extends Collections> = {
	[K in keyof C]: C[K] extends JsonCollection<infer S> ? z.output<S> : C[K] extends MarkdownCollection<infer S> ? z.output<S>[] : never;
};
