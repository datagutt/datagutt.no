import { Suspense } from "react";
import { connection } from "next/server";
import dynamic from "next/dynamic";
import { ClientLogger } from "@/components/client-logger";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import OpenSource from "@/components/OpenSource";
import Stats from "@/components/Stats";
import { getPinnedRepos, getGitHubStats, getContributions } from "@/lib/github";
import type { BgId } from "@/components/canvas/CanvasSwitcher";

const ScrollText = dynamic(() => import("@/components/ScrollText"));
const Portfolio = dynamic(() => import("@/components/Portfolio"));
const About = dynamic(() => import("@/components/About"));
const TechStack = dynamic(() => import("@/components/TechStack"));
const Experience = dynamic(() => import("@/components/Experience"));
const Contact = dynamic(() => import("@/components/Contact"));

const BG_IDS: BgId[] = ["pixel", "terrain", "blocks", "dungeon", "starfield"];

async function DynamicHero() {
	await connection();
	const initialBg = BG_IDS[Math.floor(Math.random() * BG_IDS.length)];
	return <Hero initialBg={initialBg} />;
}

async function GitHubSections() {
	await connection();
	const [repos, stats, contributions] = await Promise.all([
		getPinnedRepos(),
		getGitHubStats(),
		getContributions(),
	]);

	return (
		<>
			<div className="pixel-divider" />
			<OpenSource repos={repos} />
			<div className="pixel-divider" />
			<Stats stats={stats} contributions={contributions} />
		</>
	);
}

export default function Home() {
	return (
		<>
			<main className="relative z-[10]">
				<Suspense fallback={<div className="w-screen h-screen bg-black" />}>
					<DynamicHero />
				</Suspense>
				<ScrollText />
				<Portfolio />
				<div className="pixel-divider" />
				<About />
				<div className="pixel-divider" />
				<TechStack />
				<div className="pixel-divider" />
				<Experience />
				<Suspense fallback={null}>
					<GitHubSections />
				</Suspense>
				<div className="pixel-divider" />
				<Contact />
			</main>
			<Suspense fallback={null}>
				<Footer />
			</Suspense>
			<ClientLogger />
		</>
	);
}
