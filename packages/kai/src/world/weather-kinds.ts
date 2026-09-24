// The weather as the game knows it: a kind of sky, the wind and the temperature. A live
// source (such as @datagutt/kai-live's MET Norway fetcher) fills it in; the runtime draws
// and hears it.

export const WEATHER_KINDS = ["clear", "cloudy", "rain", "heavyRain", "snow", "sleet", "fog", "storm"] as const;
export type WeatherKind = (typeof WEATHER_KINDS)[number];

export const isWeatherKind = (value: unknown): value is WeatherKind => WEATHER_KINDS.includes(value as WeatherKind);

/** The weather now where the visitor is, or at the game's fallback place. */
export type WeatherNow = {
	kind: WeatherKind;
	/** Wind speed in m/s. */
	wind: number;
	/** Where the wind blows from, in degrees: 0 north, 90 east. */
	windFrom: number;
	/** Air temperature in °C, or null when unknown. */
	temperature: number | null;
	/** MET's symbol code it was read from ("clearsky_day", "heavyrain"); empty when not live. */
	symbol: string;
	/** The city it is for. */
	place: string;
	/**
	 * True when it came from the forecast. False is the calm fallback (MET was down, or
	 * there is no payload): the game then shows only its seasonal particles.
	 */
	live: boolean;
};

/** No weather to speak of: what the game shows when it has no forecast. */
export const calmWeather = (place: string): WeatherNow => ({
	kind: "clear",
	wind: 0,
	windFrom: 0,
	temperature: null,
	symbol: "",
	place,
	live: false,
});
