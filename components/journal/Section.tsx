import Link from "next/link";
import type { ReactNode } from "react";
import type { Place } from "@/content/places";

/** One chapter of the Journal, with a way into the game at the place that tells it. */
export function Section({ id, title, place, children }: { id: string; title: string; place?: Place; children: ReactNode }) {
	return (
		<section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 border-t-2 border-dashed border-[#1b2440]/20 pt-10">
			<div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
				<h2 id={`${id}-title`} className="font-pixel text-2xl uppercase tracking-wider">
					<a href={`#${id}`} className="decoration-[#c8413f] decoration-2 underline-offset-4 hover:underline">
						{title}
					</a>
				</h2>
				{place && (
					<Link href={`/?at=${place.id}`} className="font-pixel text-sm uppercase tracking-wider text-[#8a2f2d] underline decoration-2 underline-offset-4">
						Visit the {place.name.replace(/^datagutt's /, "")} in the game
					</Link>
				)}
			</div>
			{children}
		</section>
	);
}
