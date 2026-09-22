import Link from "next/link";

// Placeholder until the real Journal lands (docs/game/PLAN.md M6.1).
export default function Journal() {
	return (
		<main className="row py-20">
			<h1 className="mb-4 font-pixel text-4xl uppercase">Journal</h1>
			<p className="mb-6 text-gray-300">
				The plain-text version of the site is being written. Until then, the current site is
				at <Link className="underline" href="/legacy">/legacy</Link>.
			</p>
			<Link className="font-pixel uppercase underline" href="/">
				Back to the game
			</Link>
		</main>
	);
}
