// Every map the generator owns. `pnpm world:gen` writes each to world/maps/<id>.tmj.
import type { MapCanvas } from "../canvas.ts";
import { overworld } from "./overworld.ts";

export type GeneratedMap = { id: string; properties?: Record<string, string>; build: () => MapCanvas };

export const GENERATED_MAPS: GeneratedMap[] = [{ id: "overworld", properties: { name: "Fjord Town" }, build: overworld }];
