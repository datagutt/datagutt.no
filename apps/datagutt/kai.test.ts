import { loadKaiConfig } from "@datagutt/kai/schema";
import { expect, it } from "vitest";

it("kai.json is a valid kai config", () => {
	expect(loadKaiConfig(import.meta.dirname).id).toBe("datagutt");
});
