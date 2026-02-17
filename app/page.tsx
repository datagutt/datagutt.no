import { Suspense } from "react";
import { ClientLogger } from "@/components/client-logger";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Portfolio from "@/components/Portfolio";
import ScrollText from "@/components/ScrollText";

export default async function Home() {
	return (
		<>
			<main className="relative z-[10]">
				<Suspense fallback={null}>
					<Hero />
				</Suspense>
				<Suspense fallback={null}>
					<ScrollText />
				</Suspense>
				<Portfolio />
			</main>
			<Suspense fallback={null}>
				<Footer />
			</Suspense>
			<ClientLogger />
		</>
	);
}
