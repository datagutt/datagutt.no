import { Suspense } from "react";
import { connection } from "next/server";
import { ClientLogger } from "@/components/client-logger";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Portfolio from "@/components/Portfolio";
import ScrollText from "@/components/ScrollText";
import type { BgId } from "@/components/canvas/CanvasSwitcher";

const BG_IDS: BgId[] = ["pixel", "terrain", "blocks", "dungeon", "starfield"];

async function DynamicHero() {
	await connection();
	const initialBg = BG_IDS[Math.floor(Math.random() * BG_IDS.length)];
	return <Hero initialBg={initialBg} />;
}

export default function Home() {
	return (
		<>
			<main className="relative z-[10]">
				<Suspense fallback={null}>
					<DynamicHero />
				</Suspense>
				<ScrollText />
				<Portfolio />
			</main>
			<Suspense fallback={null}>
				<Footer />
			</Suspense>
			<ClientLogger />
		</>
	);
}
