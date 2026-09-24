// The engine's UI copy in English. A game overrides any of it by key in
// content/strings.json; `{name}` in a text is filled in where it is shown.

export const DEFAULT_STRINGS = {
	"menu.title": "Menu",
	"menu.button": "Menu",
	"menu.passport": "Passport",
	"menu.status": "Status",
	"menu.journal": "Journal",
	"menu.settings": "Settings",
	"menu.credits": "Credits",
	"menu.close": "Close",
	"menu.back": "Back",
	"menu.backHint": "Tap or press E to go back.",
	"status.title": "Status",
	"credits.title": "Credits",
	"settings.title": "Settings",
	"settings.sound": "Sound: {value}",
	"settings.music": "Music: {value}",
	"settings.visitors": "Other visitors: {value}",
	"settings.effects": "Effects: {value}",
	"settings.reducedMotion": "Reduced motion: {value}",
	"value.on": "On",
	"value.off": "Off",
	"value.auto": "Auto",
	"value.high": "High",
	"value.low": "Low",
	"passport.title": "Passport",
	"passport.achievements": "Achievements",
	"passport.pageHint": "Left, right or tap: turn the page.",
	"passport.stampsHint": "Talk to people to collect stamps. {pageHint}",
	"passport.fullHint": "Full passport. Every stamp! {pageHint}",
	"passport.achievementsHint": "Things to find beyond the stamps. {pageHint}",
	"passport.unknown": "???",
	"toast.stamped": "Stamped: {place}  {count}/{total}",
	"toast.achievement": "Achievement: {name}",
	"prompt.talk": "Talk",
	"prompt.read": "Read",
	"prompt.enter": "Enter",
	"prompt.wake": "Wake",
	"prompt.play": "Play",
	"prompt.look": "Look",
	"prompt.use": "Use",
	"prompt.pet": "Pet",
	"link.open": "Open {label}",
	"link.notNow": "Not now",
	"arcade.leave": "{button}: leave",
	"arcade.leaveTouch": "Tap outside: leave",
} as const;

export type StringKey = keyof typeof DEFAULT_STRINGS;
export type Strings = Record<StringKey, string>;

export const STRING_KEYS = Object.keys(DEFAULT_STRINGS) as StringKey[];

/** The engine's defaults with a game's overrides on top. */
export const withDefaults = (overrides: Partial<Strings>): Strings => ({ ...DEFAULT_STRINGS, ...overrides });

/** `template` with each `{name}` replaced by `vars[name]`; unknown names stay as they are. */
export const format = (template: string, vars: Record<string, string | number>): string =>
	template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
