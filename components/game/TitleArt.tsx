// The title screen's backdrop (docs/game/PLAN.md M5.11): a summer day on the fjord.
// The sky, clouds and mountains are drawn here on a pixel grid where one unit is one game
// pixel: a wide screen sees the bottom 512×288 (18 tiles tall, like the game's own view),
// a tall phone screen sees more sky above it at about the game's phone zoom. The waterfront in front is the
// game's own tiles, rendered by `pnpm assets` (world/gen/title.ts). Placeholder builds
// have no such image, and the sky stands alone. It all renders on the server and moves
// with CSS alone; GameShell sets --title-x and --title-y from the pointer for parallax.
const W = 512;
const H = 288;
/** Extra sky above the 16:9 frame, for tall screens. */
const TOP = -150;
/** Where the waterfront image starts, and how big it is (40×10 tiles). */
const STRIP = { x: (W - 640) / 2, y: H - 160, w: 640, h: 160 };
/** The mountains stand on this line, hidden behind the forest at the top of the strip. */
const BASE = STRIP.y + 24;
/** Mountains are drawn wider than the view so parallax never shows their ends. */
const OVERSCAN = 40;

/** Deterministic smooth noise, so the server render is the same on every build. */
function ridge(seed: number, x: number, freq: number): number {
	const f = x * freq + seed * 17.13;
	const i = Math.floor(f);
	const t = f - i;
	const hash = (n: number) => {
		const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
		return s - Math.floor(s);
	};
	const smooth = t * t * (3 - 2 * t);
	return hash(i) * (1 - smooth) + hash(i + 1) * smooth;
}

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

/** Deeper blue above the frame, in wide steps. */
const highSky = ["#2d62cc", "#3369d3", "#3a72da"];
const skyBands = ["#3f7fe0", "#4a8ae4", "#5696e8", "#62a2ec", "#70aeef", "#7fbaf2", "#8fc6f4", "#a2d1f6", "#b6dcf8", "#cbe7fa"];

const farHeight = (x: number) => BASE - 70 - ridge(1, x, 0.03) * 34 - ridge(2, x, 0.1) * 9;
const farMountains = steppedPath(farHeight, BASE);
/** Snow on the far peaks: from the ridge down to a ragged snowline. */
const SNOWLINE = BASE - 84;
const farSnow = (() => {
	// Runs of columns with the same top and snowline become one rectangle.
	let d = "";
	let run: { x: number; top: number; line: number } | null = null;
	const close = (end: number) => {
		if (run && run.top < run.line) d += `M${run.x} ${run.top}H${end}V${run.line}H${run.x}Z`;
	};
	for (let x = -OVERSCAN; x <= W + OVERSCAN; x++) {
		const top = Math.round(farHeight(x));
		const line = Math.round(SNOWLINE + ridge(4, x, 0.3) * 6);
		if (run && run.top === top && run.line === line && x < W + OVERSCAN) continue;
		close(x);
		run = { x, top, line };
	}
	return d;
})();
/** Rolling hills between the peaks and the fjord's walls. */
const midHills = steppedPath((x) => BASE - 30 - ridge(5, x, 0.045) * 26 - ridge(6, x, 0.15) * 5, BASE);
const nearMountains = steppedPath((x) => {
	// The fjord's walls: steep at the sides, falling away towards the water in the middle.
	const edge = Math.min(Math.abs(x), Math.abs(W - x)) / (W / 2);
	const wall = edge < 0.45 ? ((0.45 - edge) / 0.45) ** 0.8 * 92 : 0;
	return BASE - 12 - wall - ridge(3, x, 0.07) * 10;
}, BASE);

/** A pixel cloud: rows of [x offset, width] stacked from the top. */
const CLOUD_SHAPES: [number, number][][] = [
	[[6, 8], [2, 18], [0, 26], [3, 20]],
	[[4, 6], [10, 8], [1, 22], [0, 30], [4, 22]],
	[[3, 10], [0, 16], [2, 12]],
];
const clouds = [
	{ x: 60, y: -110, shape: 1, layer: "far" },
	{ x: 330, y: -70, shape: 0, layer: "far" },
	{ x: 200, y: -30, shape: 2, layer: "near" },
	{ x: 30, y: 26, shape: 0, layer: "far" },
	{ x: 150, y: 48, shape: 2, layer: "far" },
	{ x: 300, y: 18, shape: 1, layer: "far" },
	{ x: 420, y: 56, shape: 2, layer: "far" },
	{ x: 90, y: 70, shape: 1, layer: "near" },
	{ x: 260, y: 84, shape: 0, layer: "near" },
	{ x: 400, y: 100, shape: 2, layer: "near" },
] as const;

function Cloud({ x, y, shape }: { x: number; y: number; shape: number }) {
	return (
		<g>
			{CLOUD_SHAPES[shape].map(([dx, w], row) => (
				<rect key={row} x={x + dx} y={y + row * 3} width={w} height={3} fill={row === CLOUD_SHAPES[shape].length - 1 ? "#d6e8f7" : "#ffffff"} />
			))}
		</g>
	);
}

/** A cloud layer drawn twice, a view's width apart, so it can drift in a seamless loop. */
function CloudLayer({ layer }: { layer: "far" | "near" }) {
	const own = clouds.filter((c) => c.layer === layer);
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
			{highSky.map((color, i) => (
				<rect key={color} x={-OVERSCAN} y={TOP + i * 50} width={W + OVERSCAN * 2} height={51} fill={color} />
			))}
			{skyBands.map((color, i) => (
				<rect key={color} x={-OVERSCAN} y={i * 14} width={W + OVERSCAN * 2} height={15} fill={color} />
			))}
			<rect x={-OVERSCAN} y={skyBands.length * 14} width={W + OVERSCAN * 2} height={H} fill={skyBands.at(-1)} />
			{/* The sun: a pixel disc inside a fainter stepped halo. */}
			<g className="title-layer" style={parallax(1)}>
				<g fill="#fff6c9" opacity={0.3}>
					<rect x={406} y={20} width={32} height={40} />
					<rect x={402} y={24} width={40} height={32} />
				</g>
				<g fill="#fff1a8">
					<rect x={410} y={28} width={24} height={24} />
					<rect x={414} y={24} width={16} height={32} />
					<rect x={406} y={32} width={32} height={16} />
				</g>
			</g>
			<CloudLayer layer="far" />
			<g className="title-layer" style={parallax(2)}>
				<path d={farMountains} fill="#8ea4c8" />
				<path d={farSnow} fill="#f2f6fb" />
			</g>
			<g className="title-layer" style={parallax(3)}>
				<path d={midHills} fill="#6f8eb0" />
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
				<path d={nearMountains} fill="#4f7390" />
				<rect x={-OVERSCAN} y={BASE - 14} width={W + OVERSCAN * 2} height={20} fill="#3f6a86" />
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
