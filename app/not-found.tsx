import type { Metadata } from "next";
import Link from "next/link";
import { TitleArt } from "@/components/game/TitleArt";

export const metadata: Metadata = { title: "Off the map" };

/** A wrong address: the fjord from the title screen, and the two ways back. */
export default function NotFound() {
	return (
		<main className="fixed inset-0 overflow-hidden bg-[#3f7fe0]">
			<TitleArt />
			<div className="absolute inset-x-0 top-[14vh] flex flex-col items-center px-4 text-center">
				<h1 className="title-logo font-pixel text-5xl uppercase tracking-[0.12em] text-[#fff4d6] sm:text-7xl">404</h1>
				<div className="mt-8 w-full max-w-sm border-2 border-[#fff4d6] bg-[#1b2440]/90 p-4 shadow-[4px_4px_0_#0b1320]">
					<p className="font-pixel text-sm leading-relaxed text-[#fff4d6]">You wandered off the map. There&apos;s nothing here but fjord.</p>
					<ul className="mt-4 flex flex-col gap-2 font-pixel text-base uppercase tracking-wider text-[#fff4d6]">
						<li>
							<Link href="/" className="underline decoration-2 underline-offset-4">
								Back to town
							</Link>
						</li>
						<li>
							<Link href="/journal" className="underline decoration-2 underline-offset-4">
								Read it as a normal website
							</Link>
						</li>
					</ul>
				</div>
			</div>
		</main>
	);
}
