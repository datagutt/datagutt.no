"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const PixelCanvas = dynamic(() => import("./PixelCanvas"), { ssr: false });
const TerrainCanvas = dynamic(() => import("./TerrainCanvas"), { ssr: false });
const FallingBlocksCanvas = dynamic(() => import("./FallingBlocksCanvas"), {
	ssr: false,
});
const DungeonCanvas = dynamic(() => import("./DungeonCanvas"), { ssr: false });
const StarfieldCanvas = dynamic(() => import("./StarfieldCanvas"), {
	ssr: false,
});

const BACKGROUNDS = [
	{ id: "pixel", label: "Pixel Grid" },
	{ id: "terrain", label: "Terrain" },
	{ id: "blocks", label: "Tetris" },
	{ id: "dungeon", label: "Dungeon" },
	{ id: "starfield", label: "Starfield" },
] as const;

export type BgId = (typeof BACKGROUNDS)[number]["id"];

type Props = {
	initialBg: BgId;
	mouseContainerRef?: React.RefObject<HTMLElement | null>;
	burstActive?: boolean;
	className?: string;
};

export default function CanvasSwitcher({
	initialBg,
	mouseContainerRef,
	burstActive,
	className,
}: Props) {
	const [active, setActive] = useState<BgId>(initialBg);

	return (
		<>
			{/* Canvas */}
			{active === "pixel" && (
				<PixelCanvas
					burstActive={burstActive}
					mouseContainerRef={mouseContainerRef}
					className={className}
				/>
			)}
			{active === "terrain" && (
				<TerrainCanvas
					mouseContainerRef={mouseContainerRef}
					className={className}
				/>
			)}
			{active === "blocks" && (
				<FallingBlocksCanvas
					mouseContainerRef={mouseContainerRef}
					className={className}
				/>
			)}
			{active === "dungeon" && (
				<DungeonCanvas
					mouseContainerRef={mouseContainerRef}
					className={className}
				/>
			)}
			{active === "starfield" && (
				<StarfieldCanvas
					mouseContainerRef={mouseContainerRef}
					className={className}
				/>
			)}

			{/* Switcher pills */}
			<div className="absolute bottom-8 right-8 z-50 flex gap-1.5">
				{BACKGROUNDS.map((bg) => (
					<button
						key={bg.id}
						onClick={() => setActive(bg.id)}
						className={`font-pixel text-[10px] uppercase tracking-wider px-2.5 py-1 rounded transition-all duration-200 ${
							active === bg.id
								? "bg-primary-800/60 text-primary-300 border border-primary-600/50"
								: "bg-black/40 text-primary-800 border border-primary-900/30 hover:text-primary-600 hover:border-primary-700/40"
						}`}
					>
						{bg.label}
					</button>
				))}
			</div>
		</>
	);
}
