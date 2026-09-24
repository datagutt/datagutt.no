// Every map the generator owns. `bun run world:gen` writes each to world/maps/<id>.tmj.
import type { GeneratedMap } from "@datagutt/kai-worldgen/maps";
import { content } from "../../../content/index.ts";
import { boathouse } from "./boathouse.ts";
import { farmhouse } from "./farmhouse.ts";
import { house, houseUpstairs } from "./house.ts";
import { kiosk } from "./kiosk.ts";
import { library } from "./library.ts";
import { postOffice } from "./postOffice.ts";
import { radioHut } from "./radioHut.ts";
import { townHall, townHallBasement } from "./townHall.ts";
import { gym } from "./gym.ts";
import { office } from "./office.ts";
import { youthClub } from "./youthClub.ts";
import { mountain } from "./mountain.ts";
import { overworld } from "./overworld.ts";

export type { GeneratedMap };

const NAMES = content.mapText.names;

export const GENERATED_MAPS: GeneratedMap[] = [
	{ id: "town", properties: { name: NAMES["town"] }, outdoor: true, build: overworld },
	{ id: "house", properties: { name: NAMES["house"] }, build: house },
	{ id: "house-up", properties: { name: NAMES["house-up"] }, build: houseUpstairs },
	{ id: "boathouse", properties: { name: NAMES["boathouse"] }, build: boathouse },
	{ id: "library", properties: { name: NAMES["library"] }, build: library },
	{ id: "kiosk", properties: { name: NAMES["kiosk"] }, build: kiosk },
	{ id: "post-office", properties: { name: NAMES["post-office"] }, build: postOffice },
	{ id: "gym", properties: { name: NAMES["gym"] }, build: gym },
	{ id: "farmhouse", properties: { name: NAMES["farmhouse"] }, build: farmhouse },
	{ id: "radio-hut", properties: { name: NAMES["radio-hut"] }, build: radioHut },
	{ id: "town-hall", properties: { name: NAMES["town-hall"] }, build: townHall },
	{ id: "town-hall-basement", properties: { name: NAMES["town-hall-basement"] }, build: townHallBasement },
	{ id: "office", properties: { name: NAMES["office"] }, build: office },
	{ id: "youth-club", properties: { name: NAMES["youth-club"] }, build: youthClub },
	{ id: "mountain", properties: { name: NAMES["mountain"] }, outdoor: true, build: mountain },
];
