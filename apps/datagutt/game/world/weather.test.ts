import { describe, expect, it } from "vitest";
import type { WeatherNow } from "@datagutt/kai-live";
import { CALM_WEATHER } from "../../content/live";
import { resolveWeather, skyFor, weatherSound } from "./weather";

const live = (kind: WeatherNow["kind"], wind = 3, windFrom = 270): WeatherNow => ({ kind, wind, windFrom, temperature: 8, symbol: kind, place: "Oslo", live: true });

describe("resolveWeather", () => {
	const served = live("cloudy");

	it("uses the served weather without an override", () => {
		expect(resolveWeather("", served)).toBe(served);
		expect(resolveWeather("?weather=storm", served)).toBe(served);
	});

	it("takes `?debug&weather=<kind>`, with that kind's usual wind", () => {
		expect(resolveWeather("?debug&weather=storm", served)).toMatchObject({ kind: "storm", symbol: "debug", live: true });
		expect(resolveWeather("?debug&weather=storm", served).wind).toBeGreaterThan(resolveWeather("?debug&weather=rain", served).wind);
		expect(resolveWeather("?debug&weather=heavyRain", CALM_WEATHER).kind).toBe("heavyRain");
	});

	it("ignores an unknown kind", () => {
		expect(resolveWeather("?debug&weather=tornado", served)).toBe(served);
	});
});

describe("skyFor", () => {
	it("rains, snows and storms whatever the season", () => {
		expect(skyFor("summer", live("snow")).falls).toEqual([{ kind: "snow", density: 1 }]);
		expect(skyFor("winter", live("rain")).falls).toEqual([{ kind: "rain", density: 1 }]);
		expect(skyFor("autumn", live("sleet")).falls.map((f) => f.kind)).toEqual(["rain", "snow"]);
		const storm = skyFor("spring", live("storm", 18));
		expect(storm).toMatchObject({ lightning: true, clear: false });
		expect(storm.falls[0].kind).toBe("heavyRain");
		expect(storm.overcast).toBeGreaterThan(skyFor("spring", live("rain")).overcast);
	});

	it("keeps the season's particles on a dry day, but real snow only from the forecast", () => {
		expect(skyFor("autumn", live("clear")).falls).toEqual([{ kind: "autumn", density: 1 }]);
		expect(skyFor("summer", live("fog"))).toMatchObject({ fog: true, falls: [{ kind: "summer" }] });
		expect(skyFor("winter", live("clear")).falls).toEqual([]);
		// The calm fallback keeps winter's gentle seasonal snowfall.
		expect(skyFor("winter", CALM_WEATHER).falls).toEqual([{ kind: "winter", density: 1 }]);
		expect(skyFor("winter", CALM_WEATHER)).toMatchObject({ overcast: 0, clear: true, lightning: false });
	});

	it("blows particles with the wind's east–west part", () => {
		expect(skyFor("summer", live("rain", 5, 270)).drift).toBeGreaterThan(0);
		expect(skyFor("summer", live("rain", 5, 90)).drift).toBeLessThan(0);
		expect(Math.abs(skyFor("summer", live("rain", 5, 0)).drift)).toBe(0);
		expect(Math.abs(skyFor("summer", live("storm", 40, 270)).drift)).toBeLessThanOrEqual(80);
	});
});

describe("weatherSound", () => {
	it("hears rain and thunder, not snow", () => {
		expect(weatherSound(live("heavyRain"))).toMatchObject({ rain: 1, thunder: false });
		expect(weatherSound(live("storm", 30))).toEqual({ rain: 1, wind: 1, thunder: true });
		expect(weatherSound(live("snow")).rain).toBe(0);
		expect(weatherSound(CALM_WEATHER)).toEqual({ rain: 0, wind: 0, thunder: false });
	});
});
