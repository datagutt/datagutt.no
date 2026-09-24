// The title screen's backdrop (docs/game/PLAN.md M5.11): a summer day on the fjord.
// The sky, clouds and mountains are drawn here on a pixel grid where one unit is one game
// pixel: a wide screen sees the bottom 512×288 (18 tiles tall, like the game's own view),
// a tall phone screen sees more sky above it at about the game's phone zoom. The waterfront in front is the
// game's own tiles, rendered by `bun run assets` (world/gen/title.ts). Placeholder builds
// have no such image, and the sky stands alone. It all renders on the server and moves
// with CSS alone; GameShell sets --title-x and --title-y from the pointer for parallax.
import {
	BASE,
	CLOUD_ROW,
	CLOUD_SHAPES,
	CLOUDS,
	COLORS,
	farHeight,
	FJORD,
	H,
	HIGH_SKY,
	midHeight,
	nearHeight,
	ridge,
	SKY_BAND_HEIGHT,
	SKY_BANDS,
	snowline,
	STRIP,
	SUN,
	W,
} from "./titleScene";

/** Extra sky above the 16:9 frame, for tall screens. */
const TOP = -150;
/** Mountains are drawn wider than the view so parallax never shows their ends. */
const OVERSCAN = 40;

/** A skyline as one stepped path: whole-pixel steps, one per change of height. */
function steppedPath(heightAt: (x: number) => number, bottom: number): string {
	let d = `M${-OVERSCAN} ${bottom}`;
	let last = bottom;
	for (let x = -OVERSCAN; x < W + OVERSCAN; x++) {
		const y = Math.round(heightAt(x));
		if (y !== last) d += `H${x}V${y}`;
		last = y;
	}
	return `${d}H${W + OVERSCAN}V${bottom}Z`;
}

const farMountains = steppedPath(farHeight, BASE);
const farSnow = (() => {
	// Runs of columns with the same top and snowline become one rectangle.
	let d = "";
	let run: { x: number; top: number; line: number } | null = null;
	const close = (end: number) => {
		if (run && run.top < run.line) d += `M${run.x} ${run.top}H${end}V${run.line}H${run.x}Z`;
	};
	for (let x = -OVERSCAN; x <= W + OVERSCAN; x++) {
		const top = Math.round(farHeight(x));
		const line = Math.round(snowline(x));
		if (run && run.top === top && run.line === line && x < W + OVERSCAN) continue;
		close(x);
		run = { x, top, line };
	}
	return d;
})();
const midHills = steppedPath(midHeight, BASE);
const nearMountains = steppedPath(nearHeight, BASE);

function Cloud({ x, y, shape }: { x: number; y: number; shape: number }) {
	return (
		<g>
			{CLOUD_SHAPES[shape].map(([dx, w], row) => (
				<rect key={row} x={x + dx} y={y + row * CLOUD_ROW} width={w} height={CLOUD_ROW} fill={row === CLOUD_SHAPES[shape].length - 1 ? COLORS.cloudShade : COLORS.cloud} />
			))}
		</g>
	);
}

/** A cloud layer drawn twice, a view's width apart, so it can drift in a seamless loop. */
function CloudLayer({ layer }: { layer: "far" | "near" }) {
	const own = CLOUDS.filter((c) => c.layer === layer);
	return (
		<g className={`title-drift-${layer}`}>
			{[0, W].map((offset) => own.map((c) => <Cloud key={`${offset}-${c.x}`} x={c.x + offset} y={c.y} shape={c.shape} />))}
		</g>
	);
}

/** Gulls: two pixels of wing either side of a body, flapping by swapping frames. */
const gulls = [
	{ x: 200, y: 60 },
	{ x: 214, y: 66 },
	{ x: 360, y: 40 },
];

/** Light glinting on the water, over the waterfront image's sea. */
const glints = Array.from({ length: 14 }, (_, i) => ({
	x: STRIP.x + 20 + Math.floor(ridge(30, i, 3.1) * (STRIP.w - 40)),
	y: STRIP.y + 104 + Math.floor(ridge(31, i, 2.3) * 48),
	w: 3 + Math.floor(ridge(32, i, 1.7) * 5),
	delay: (i % 7) * 0.4,
}));

// Layers move with the pointer by how near they are; the waterfront most.
const parallax = (depth: number) => ({
	transform: `translate(calc(var(--title-x, 0) * ${depth}px), calc(var(--title-y, 0) * ${depth / 3}px))`,
});

const css = `
.title-drift-far { animation: title-drift ${240}s linear infinite; }
.title-drift-near { animation: title-drift ${120}s linear infinite; }
@keyframes title-drift { from { transform: translateX(0); } to { transform: translateX(-${W}px); } }
.title-glint { animation: title-glint 2.8s steps(1) infinite; opacity: 0; }
@keyframes title-glint { 0%, 60% { opacity: 0; } 61%, 80% { opacity: 0.8; } 81% { opacity: 0.35; } }
.title-gulls { animation: title-gulls 60s linear infinite; }
@keyframes title-gulls { from { transform: translateX(${W / 2}px); } to { transform: translateX(-${W}px); } }
.title-wing-up { animation: title-flap 0.6s steps(1) infinite; }
.title-wing-down { animation: title-flap 0.6s steps(1) infinite reverse; }
@keyframes title-flap { 0% { opacity: 1; } 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
	.title-drift-far, .title-drift-near, .title-glint, .title-gulls, .title-wing-up, .title-wing-down { animation: none; }
	.title-glint { opacity: 0.5; }
	.title-wing-down { opacity: 0; }
	.title-layer { transform: none !important; }
}
`;

export function TitleArt() {
	return (
		<svg
			className="absolute inset-0 h-full w-full"
			viewBox={`0 ${TOP} ${W} ${H - TOP}`}
			preserveAspectRatio="xMidYMax slice"
			shapeRendering="crispEdges"
			aria-hidden="true"
		>
			<style>{css}</style>
			{HIGH_SKY.map((color, i) => (
				<rect key={color} x={-OVERSCAN} y={TOP + i * 50} width={W + OVERSCAN * 2} height={51} fill={color} />
			))}
			{SKY_BANDS.map((color, i) => (
				<rect key={color} x={-OVERSCAN} y={i * SKY_BAND_HEIGHT} width={W + OVERSCAN * 2} height={SKY_BAND_HEIGHT + 1} fill={color} />
			))}
			<rect x={-OVERSCAN} y={SKY_BANDS.length * SKY_BAND_HEIGHT} width={W + OVERSCAN * 2} height={H} fill={SKY_BANDS.at(-1)} />
			{/* The sun: a pixel disc inside a fainter stepped halo. */}
			<g className="title-layer" style={parallax(1)}>
				<g fill={COLORS.halo} opacity={0.3}>
					{SUN.halo.map((r) => (
						<rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} />
					))}
				</g>
				<g fill={COLORS.sun}>
					{SUN.disc.map((r) => (
						<rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} />
					))}
				</g>
			</g>
			<CloudLayer layer="far" />
			<g className="title-layer" style={parallax(2)}>
				<path d={farMountains} fill={COLORS.far} />
				<path d={farSnow} fill={COLORS.snow} />
			</g>
			<g className="title-layer" style={parallax(3)}>
				<path d={midHills} fill={COLORS.mid} />
			</g>
			<CloudLayer layer="near" />
			<g className="title-gulls">
				{gulls.map((g) => (
					<g key={g.x} fill="#2b3444">
						<rect x={g.x} y={g.y} width={2} height={1} />
						<g className="title-wing-up">
							<rect x={g.x - 3} y={g.y - 2} width={2} height={1} />
							<rect x={g.x + 3} y={g.y - 2} width={2} height={1} />
							<rect x={g.x - 1} y={g.y - 1} width={1} height={1} />
							<rect x={g.x + 2} y={g.y - 1} width={1} height={1} />
						</g>
						<g className="title-wing-down">
							<rect x={g.x - 3} y={g.y} width={3} height={1} />
							<rect x={g.x + 2} y={g.y} width={3} height={1} />
						</g>
					</g>
				))}
			</g>
			<g className="title-layer" style={parallax(4)}>
				<path d={nearMountains} fill={COLORS.near} />
				<rect x={-OVERSCAN} y={FJORD.y} width={W + OVERSCAN * 2} height={FJORD.h} fill={COLORS.fjord} />
			</g>
			<g className="title-layer" style={parallax(8)}>
				<image href="/game/ui/title.png" x={STRIP.x} y={STRIP.y} width={STRIP.w} height={STRIP.h} style={{ imageRendering: "pixelated" }} />
				{glints.map((g) => (
					<rect key={`${g.x}-${g.y}`} className="title-glint" style={{ animationDelay: `${g.delay}s` }} x={g.x} y={g.y} width={g.w} height={1} fill="#e8fbff" />
				))}
			</g>
		</svg>
	);
}
