import { describe, expect, it } from "vitest";
import { DEFAULT_STRINGS, format, withDefaults } from "./strings.ts";

describe("strings", () => {
	it("override the defaults by key", () => {
		const strings = withDefaults({ "passport.title": "Fjord Passport" });
		expect(strings["passport.title"]).toBe("Fjord Passport");
		expect(strings["menu.title"]).toBe(DEFAULT_STRINGS["menu.title"]);
	});

	it("fill in named values and leave unknown ones", () => {
		expect(format("Stamped: {place}  {count}/{total}", { place: "Library", count: 4, total: 10 })).toBe("Stamped: Library  4/10");
		expect(format("{known} {unknown}", { known: "a" })).toBe("a {unknown}");
	});
});
