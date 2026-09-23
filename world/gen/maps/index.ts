// Every map the generator owns. `pnpm world:gen` writes each to world/maps/<id>.tmj.
import type { MapCanvas } from "../canvas.ts";
import { boathouse } from "./boathouse.ts";
import { farmhouse } from "./farmhouse.ts";
import { house, houseUpstairs } from "./house.ts";
import { kiosk } from "./kiosk.ts";
import { library } from "./library.ts";
import { postOffice } from "./postOffice.ts";
import { radioHut } from "./radioHut.ts";
import { townHall } from "./townHall.ts";
import { gym } from "./gym.ts";
import { overworld } from "./overworld.ts";

/** `outdoor` maps change with the seasons (game/world/season.ts) and the time of day (game/fx/DayNight.ts). */
export type GeneratedMap = { id: string; properties?: Record<string, string>; outdoor?: boolean; build: () => MapCanvas };

export const GENERATED_MAPS: GeneratedMap[] = [
	{ id: "town", properties: { name: "Fjord Town" }, outdoor: true, build: overworld },
	{ id: "house", properties: { name: "datagutt's house" }, build: house },
	{ id: "house-up", properties: { name: "datagutt's house, upstairs" }, build: houseUpstairs },
	{ id: "boathouse", properties: { name: "Boathouse studio" }, build: boathouse },
	{ id: "library", properties: { name: "Library" }, build: library },
	{ id: "kiosk", properties: { name: "Kiosk" }, build: kiosk },
	{ id: "post-office", properties: { name: "Post office" }, build: postOffice },
	{ id: "gym", properties: { name: "Gym" }, build: gym },
	{ id: "farmhouse", properties: { name: "Farmhouse" }, build: farmhouse },
	{ id: "radio-hut", properties: { name: "Radio hut" }, build: radioHut },
	{ id: "town-hall", properties: { name: "Town hall" }, build: townHall },
];
