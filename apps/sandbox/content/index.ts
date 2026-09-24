import bundle from "../.kai/content.json" with { type: "json" };
import type { Content } from "./schema";

/** The compiled content (`bun run content`), already checked against content/schema.ts. */
export const content = bundle as unknown as Content;
