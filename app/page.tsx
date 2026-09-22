import { Suspense } from "react";
import { GameShell } from "@/components/game/GameShell";
import { TitleArt } from "@/components/game/TitleArt";
import { WorldStateScript } from "@/components/game/WorldStateScript";

export default function Home() {
	return (
		<main>
			<Suspense fallback={null}>
				<WorldStateScript />
			</Suspense>
			<GameShell titleArt={<TitleArt />} />
		</main>
	);
}
