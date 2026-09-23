"use client";

import { useEffect, useState } from "react";
import { STAMP_PLACES } from "@/game/progress/passport";
import { browserStorage, loadSave } from "@/game/save/save";

/** The visitor's Fjord Passport from their saved game, if they have played. Nothing without a save or JS. */
export function PassportProgress() {
	const [stamps, setStamps] = useState<string[] | null>(null);
	useEffect(() => setStamps(loadSave(browserStorage())?.stamps ?? null), []);
	if (!stamps) return null;

	const count = STAMP_PLACES.filter((p) => stamps.includes(p.id)).length;
	return (
		<aside aria-labelledby="passport-title" className="mt-8 border-2 border-[#1b2440] bg-[#fffaf0] p-4 shadow-[4px_4px_0_#1b2440]">
			<h2 id="passport-title" className="font-pixel text-base uppercase tracking-wider">
				Your Fjord Passport: {count} of {STAMP_PLACES.length} stamps
			</h2>
			<ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
				{STAMP_PLACES.map((p) => {
					const has = stamps.includes(p.id);
					return (
						<li key={p.id} className={has ? "" : "text-[#1b2440]/70"}>
							<span aria-hidden="true">{has ? "■ " : "□ "}</span>
							{p.name}
							<span className="sr-only">{has ? ", stamped" : ", not yet"}</span>
						</li>
					);
				})}
			</ul>
		</aside>
	);
}
