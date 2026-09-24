import { describe, expect, it } from "vitest";
import { CALM_WEATHER, EMPTY_WORLD_STATE } from "../../content/live";
import { parseWorldState } from "./worldState";

describe("parseWorldState", () => {
	it("reads a full payload", () => {
		const state = {
			repos: [{ author: "datagutt", name: "x", description: "", language: "Rust", languageColor: "#dea584", stars: 3, forks: 1 }],
			stats: { public_repos: 90, followers: 10, total_stars: 200, years_coding: 16 },
			contributions: [{ date: "2026-09-22", count: 4, level: 2 }],
			discordId: "42",
			weather: { kind: "rain", wind: 6.1, windFrom: 200, temperature: 9.5, symbol: "rain", place: "Bergen", live: true },
			fetchedAt: "2026-09-22T12:00:00.000Z",
		};
		expect(parseWorldState(JSON.stringify(state))).toEqual(state);
	});

	it("falls back to empty data instead of throwing", () => {
		expect(parseWorldState(null)).toEqual(EMPTY_WORLD_STATE);
		expect(parseWorldState("{oops")).toEqual(EMPTY_WORLD_STATE);
		expect(parseWorldState(JSON.stringify({ repos: "nope", stats: { followers: 5 } }))).toMatchObject({
			repos: [],
			stats: { followers: 5, public_repos: 0 },
		});
		expect(parseWorldState(JSON.stringify({ discordId: "not a snowflake" })).discordId).toBe(EMPTY_WORLD_STATE.discordId);
	});

	it("falls back to calm weather when the weather is missing or unknown", () => {
		expect(parseWorldState(JSON.stringify({})).weather).toEqual(CALM_WEATHER);
		expect(parseWorldState(JSON.stringify({ weather: { kind: "tornado" } })).weather).toEqual(CALM_WEATHER);
		expect(parseWorldState(JSON.stringify({ weather: { kind: "fog", wind: "loud", live: true } })).weather).toEqual({
			kind: "fog",
			wind: 0,
			windFrom: 0,
			temperature: null,
			symbol: "",
			place: "Oslo",
			live: true,
		});
	});
});
