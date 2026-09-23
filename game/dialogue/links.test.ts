import { describe, expect, it } from "vitest";
import { profile } from "../../content/profile";
import { resolveLink } from "./links";

describe("resolveLink", () => {
	it("resolves projects, socials and email from content", () => {
		expect(resolveLink("link: project irlserver")).toEqual({ url: "https://irlserver.com", label: "irlserver.com" });
		expect(resolveLink("link: social github")).toMatchObject({ url: "https://github.com/datagutt" });
		expect(resolveLink("link: email")).toEqual({ url: `mailto:${profile.email}`, label: profile.email });
	});

	it("ignores other tags and explains bad link tags", () => {
		expect(resolveLink("nod")).toBeNull();
		expect(resolveLink("link: project nope")).toHaveProperty("error");
		expect(resolveLink("link: social myspace")).toHaveProperty("error");
		expect(resolveLink("link: carrier-pigeon")).toHaveProperty("error");
	});
});
