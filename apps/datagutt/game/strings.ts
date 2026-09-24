// The UI copy: the engine's defaults with content/strings.json over them.
import { format, withDefaults, type StringKey } from "@datagutt/kai/ui/strings";
import { content } from "../content/index.ts";

const STRINGS = withDefaults(content.strings);

/** A UI text by key, with its `{name}` values filled in. */
export const t = (key: StringKey, vars?: Record<string, string | number>): string => (vars ? format(STRINGS[key], vars) : STRINGS[key]);
