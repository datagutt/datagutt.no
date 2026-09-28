import { describe, expect, it } from "vitest";
import { placeFromHeaders, weatherFromForecast, weatherFromSymbol, weatherPlace } from "./weather.ts";

const OSLO = weatherPlace("Oslo", 59.9139, 10.7522);

const calm = { wind_speed: 3, air_temperature: 12, cloud_area_fraction: 40, wind_from_direction: 200 };
const kind = (symbol: string, details: Parameters<typeof weatherFromSymbol>[1] = calm) => weatherFromSymbol(symbol, details, "Oslo").kind;

describe("weatherFromSymbol", () => {
	it("maps MET's symbols to the game's weather", () => {
		expect(kind("clearsky_day")).toBe("clear");
		expect(kind("fair_night")).toBe("clear");
		expect(kind("partlycloudy_polartwilight")).toBe("clear");
		expect(kind("cloudy")).toBe("cloudy");
		expect(kind("fog")).toBe("fog");
		expect(kind("lightrain")).toBe("rain");
		expect(kind("rainshowers_day")).toBe("rain");
		expect(kind("heavyrain")).toBe("heavyRain");
		expect(kind("heavyrainshowers_night")).toBe("heavyRain");
		expect(kind("lightsleet")).toBe("sleet");
		expect(kind("heavysleetshowers_day")).toBe("sleet");
		expect(kind("snow")).toBe("snow");
		expect(kind("lightsnowshowers_day")).toBe("snow");
	});

	it("makes thunder with rain or sleet a storm, and keeps thundersnow snow", () => {
		expect(kind("rainandthunder")).toBe("storm");
		expect(kind("lightrainshowersandthunder_day")).toBe("storm");
		// MET's own spelling.
		expect(kind("lightssleetshowersandthunder_night")).toBe("storm");
		expect(kind("lightssnowshowersandthunder_day")).toBe("snow");
		expect(kind("heavysnowandthunder")).toBe("snow");
	});

	it("makes rain in a near gale a storm, but not a dry windy day", () => {
		expect(kind("rain", { ...calm, wind_speed: 15 })).toBe("storm");
		expect(kind("rain", { ...calm, wind_speed: 13 })).toBe("rain");
		expect(kind("clearsky_day", { ...calm, wind_speed: 20 })).toBe("clear");
		expect(kind("snow", { ...calm, wind_speed: 20 })).toBe("snow");
	});

	it("turns a dry sky to fog when fog covers the area", () => {
		expect(kind("cloudy", { ...calm, fog_area_fraction: 80 })).toBe("fog");
		expect(kind("rain", { ...calm, fog_area_fraction: 80 })).toBe("rain");
	});

	it("falls back on cloud cover for a symbol it doesn't know", () => {
		expect(kind("somethingnew", { ...calm, cloud_area_fraction: 90 })).toBe("cloudy");
		expect(kind("somethingnew", { ...calm, cloud_area_fraction: 10 })).toBe("clear");
	});

	it("carries wind, direction and temperature", () => {
		expect(weatherFromSymbol("rain_day", calm, "Oslo")).toEqual({ kind: "rain", wind: 3, windFrom: 200, temperature: 12, symbol: "rain_day", place: "Oslo", live: true });
		expect(weatherFromSymbol("rain", {}, "Oslo")).toMatchObject({ wind: 0, windFrom: 0, temperature: null });
	});
});

describe("weatherFromForecast", () => {
	const step = (time: string, symbol: string, wind = 2) => ({
		time,
		data: { instant: { details: { ...calm, wind_speed: wind } }, next_1_hours: { summary: { symbol_code: symbol } } },
	});
	const forecast = {
		properties: { timeseries: [step("2026-09-24T13:00:00Z", "cloudy"), step("2026-09-24T14:00:00Z", "rain", 5), step("2026-09-24T15:00:00Z", "heavyrain")] },
	};

	it("reads the step for the current hour", () => {
		expect(weatherFromForecast(forecast, "Oslo", new Date("2026-09-24T14:22:00Z"))).toMatchObject({ kind: "rain", wind: 5 });
		expect(weatherFromForecast(forecast, "Oslo", new Date("2026-09-24T12:00:00Z"))?.kind).toBe("cloudy");
	});

	it("uses the six-hour summary when the hourly one is missing", () => {
		const late = { properties: { timeseries: [{ time: "2026-09-24T13:00:00Z", data: { instant: { details: calm }, next_6_hours: { summary: { symbol_code: "snow" } } } }] } };
		expect(weatherFromForecast(late, "Oslo", new Date("2026-09-24T14:00:00Z"))?.kind).toBe("snow");
	});

	it("returns null for a response it doesn't understand", () => {
		expect(weatherFromForecast(null, "Oslo")).toBeNull();
		expect(weatherFromForecast({ properties: { timeseries: [] } }, "Oslo")).toBeNull();
		expect(weatherFromForecast({ properties: { timeseries: [{ time: "2026-09-24T13:00:00Z", data: { instant: { details: calm } } }] } }, "Oslo")).toBeNull();
	});
});

describe("placeFromHeaders", () => {
	const headers = (entries: Record<string, string>) => new Headers(entries);

	it("reads Vercel's city and coordinates, to one decimal", () => {
		expect(
			placeFromHeaders(headers({ "x-vercel-ip-city": "S%C3%A3o%20Paulo", "x-vercel-ip-latitude": "-23.5475", "x-vercel-ip-longitude": "-46.63611" }), OSLO),
		).toEqual({ city: "São Paulo", lat: -23.5, lon: -46.6 });
	});

	it("falls back to Oslo without a usable location", () => {
		expect(placeFromHeaders(headers({}), OSLO)).toEqual(OSLO);
		expect(placeFromHeaders(headers({ "x-vercel-ip-city": "Bergen" }), OSLO)).toEqual(OSLO);
		expect(placeFromHeaders(headers({ "x-vercel-ip-city": "Nowhere", "x-vercel-ip-latitude": "123", "x-vercel-ip-longitude": "10" }), OSLO)).toEqual(OSLO);
		expect(placeFromHeaders(headers({ "x-vercel-ip-city": "Nowhere", "x-vercel-ip-latitude": "x", "x-vercel-ip-longitude": "10" }), OSLO)).toEqual(OSLO);
	});

	it("keeps the coordinates when the city can't be decoded", () => {
		expect(placeFromHeaders(headers({ "x-vercel-ip-city": "%E0%A4%A", "x-vercel-ip-latitude": "60.39", "x-vercel-ip-longitude": "5.32" }), OSLO)).toEqual({ city: "%E0%A4%A", lat: 60.4, lon: 5.3 });
	});
});
