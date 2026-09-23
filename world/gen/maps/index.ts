// Every map the generator owns. `pnpm world:gen` writes each to world/maps/<id>.tmj.
import type { MapCanvas } from "../canvas.ts";
import { boathouse } from "./boathouse.ts";
import { house, houseUpstairs } from "./house.ts";
import { kiosk } from "./kiosk.ts";
import { library } from "./library.ts";
import { postOffice } from "./postOffice.ts";
import { overworld } from "./overworld.ts";

export type GeneratedMap = { id: string; properties?: Record<string, string>; build: () => MapCanvas };

export const GENERATED_MAPS: GeneratedMap[] = [
	{ id: "town", properties: { name: "Fjord Town" }, build: overworld },
	{ id: "house", properties: { name: "datagutt's house" }, build: house },
	{ id: "house-up", properties: { name: "datagutt's house, upstairs" }, build: houseUpstairs },
	{ id: "boathouse", properties: { name: "Boathouse studio" }, build: boathouse },
	{ id: "library", properties: { name: "Library" }, build: library },
	{ id: "kiosk", properties: { name: "Kiosk" }, build: kiosk },
	{ id: "post-office", properties: { name: "Post office" }, build: postOffice },
];
