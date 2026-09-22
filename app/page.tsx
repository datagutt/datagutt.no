import { GameShell } from "@/components/game/GameShell";
import { TitleArt } from "@/components/game/TitleArt";

export default function Home() {
	return (
		<main>
			<GameShell titleArt={<TitleArt />} />
		</main>
	);
}
