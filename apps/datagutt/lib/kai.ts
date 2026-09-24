import type { KaiConfigInput } from "@datagutt/kai/schema";
import raw from "../kai.json";

// kai.json for code that runs in Next. The asset build validates it fully (`bun run
// assets`); here TypeScript only checks its shape.
export const kaiConfig = raw satisfies KaiConfigInput;
