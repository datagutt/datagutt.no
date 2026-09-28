import { Suspense } from "react";
import { LiveDataPending } from "@datagutt/kai-next/live-data";
import { GameShell } from "@/components/game/GameShell";
import { TitleArt } from "@/components/game/TitleArt";
import { WorldStateScript } from "@/components/game/WorldStateScript";

export default function Home() {
	return (
		<main>
			<Suspense fallback={<LiveDataPending />}>
				<WorldStateScript />
			</Suspense>
			<GameShell titleArt={<TitleArt />} />
		</main>
	);
}
