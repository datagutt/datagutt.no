import { Suspense } from "react";
import { connection } from "next/server";
import { ClientLogger } from "@/components/client-logger";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Portfolio from "@/components/Portfolio";
import ScrollText from "@/components/ScrollText";

const BG_IDS = ["pixel", "terrain", "blocks", "dungeon", "starfield"] as const;

export default async function Home() {
	await connection();
	const initialBg = BG_IDS[Math.floor(Math.random() * BG_IDS.length)];

	return (
		<>
			<main className="relative z-[10]">
				<Hero initialBg={initialBg} />
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
