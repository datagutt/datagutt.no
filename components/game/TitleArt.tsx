// Server-rendered pixel-art backdrop for the title screen: a fjord at dusk. Drawn on a
// 320×180 grid with stepped paths so it scales up like pixel art, and it costs no JS.
const W = 320;
const H = 180;
const HORIZON = 128;

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

/** A skyline as one stepped path: every column is a whole-pixel step. */
function steppedPath(heightAt: (x: number) => number, bottom: number): string {
	let d = `M0 ${bottom}`;
	for (let x = 0; x < W; x++) {
		d += `V${Math.round(heightAt(x))}H${x + 1}`;
	}
	return `${d}V${bottom}Z`;
}

const skyBands = ["#0b1320", "#101a2e", "#16213b", "#1f2747", "#2c2d52", "#40325a", "#5b3a5e", "#7c4560", "#a0525c", "#c26a55"];

const farMountains = steppedPath(
	(x) => HORIZON - 34 - ridge(1, x, 0.035) * 30 - ridge(2, x, 0.11) * 8,
	HORIZON,
);
const nearMountains = steppedPath((x) => {
	// A fjord: steep walls at the sides that fall away towards open water in the middle.
	const edge = Math.min(x, W - x) / (W / 2);
	const wall = edge < 0.4 ? ((0.4 - edge) / 0.4) ** 0.7 * 62 : 0;
	return HORIZON - 3 - wall - ridge(3, x, 0.08) * 8;
}, HORIZON + 2);

const stars = Array.from({ length: 36 }, (_, i) => ({
	x: Math.floor(ridge(10, i, 7.7) * W),
	y: Math.floor(ridge(11, i, 5.3) * 60),
	bright: i % 5 === 0,
}));

const aurora = Array.from({ length: W / 2 }, (_, i) => {
	const x = i * 2;
	const top = 18 + ridge(20, x, 0.02) * 22 + ridge(21, x, 0.09) * 6;
	return { x, top: Math.round(top), height: Math.round(10 + ridge(22, x, 0.05) * 26) };
});

/** Red wooden houses on the near shore: [x, width, height]. */
const houses: [number, number, number][] = [
	[36, 14, 9],
	[54, 10, 8],
	[70, 16, 10],
	[232, 12, 9],
	[250, 18, 11],
	[274, 11, 8],
];

export function TitleArt() {
	return (
		<svg
			className="absolute inset-0 h-full w-full"
			viewBox={`0 0 ${W} ${H}`}
			preserveAspectRatio="xMidYMax slice"
			shapeRendering="crispEdges"
			aria-hidden="true"
		>
			{skyBands.map((color, i) => (
				<rect key={color} x={0} y={i * 13} width={W} height={14} fill={color} />
			))}
			<g fill="#1dc672" opacity={0.18}>
				{aurora.map((a) => (
					<rect key={a.x} x={a.x} y={a.top} width={2} height={a.height} />
				))}
			</g>
			<g fill="#46e294" opacity={0.28}>
				{aurora.map((a) => (
					<rect key={a.x} x={a.x} y={a.top} width={2} height={3} />
				))}
			</g>
			{stars.map((s) => (
				<rect key={`${s.x}-${s.y}`} x={s.x} y={s.y} width={1} height={1} fill={s.bright ? "#fff7d6" : "#9fb3d9"} />
			))}
			<path d={farMountains} fill="#2a2e4f" />
			<path d={nearMountains} fill="#171b33" />
			{/* The fjord and the sunset's reflection in it. */}
			<rect x={0} y={HORIZON} width={W} height={H - HORIZON} fill="#0e1628" />
			{[0, 1, 2, 3, 4, 5, 6].map((i) => (
				<rect
					key={i}
					x={120 + ((i * 37) % 60) - i * 3}
					y={HORIZON + 3 + i * 5}
					width={80 - i * 8}
					height={1}
					fill="#c26a55"
					opacity={0.5 - i * 0.06}
				/>
			))}
			{/* Shore strips with houses. */}
			<rect x={0} y={HORIZON + 12} width={104} height={H} fill="#141a2c" />
			<rect x={220} y={HORIZON + 14} width={100} height={H} fill="#141a2c" />
			{houses.map(([x, w, h]) => {
				const ground = x < 160 ? HORIZON + 12 : HORIZON + 14;
				return (
					<g key={x}>
						<rect x={x} y={ground - h} width={w} height={h} fill="#8e2a22" />
						<rect x={x - 1} y={ground - h - 3} width={w + 2} height={3} fill="#2b1a1f" />
						<rect x={x + 2} y={ground - h + 3} width={2} height={2} fill="#ffd27a" />
						{w > 12 && <rect x={x + w - 5} y={ground - h + 3} width={2} height={2} fill="#ffd27a" />}
					</g>
				);
			})}
			{/* Foreground pier and boathouse, so narrow portrait screens get a subject too. */}
			<g>
				<rect x={116} y={166} width={96} height={3} fill="#3a2a22" />
				{[120, 138, 156, 174, 192, 208].map((x) => (
					<rect key={x} x={x} y={169} width={2} height={11} fill="#2a1d18" />
				))}
				<rect x={188} y={150} width={20} height={16} fill="#8e2a22" />
				<rect x={186} y={146} width={24} height={4} fill="#2b1a1f" />
				<rect x={195} y={157} width={6} height={9} fill="#4a1712" />
				<rect x={191} y={153} width={2} height={2} fill="#ffd27a" />
				<rect x={128} y={150} width={1} height={16} fill="#6b7280" />
				<rect x={127} y={148} width={3} height={2} fill="#ffd27a" />
				<rect x={124} y={146} width={9} height={6} fill="#ffd27a" opacity={0.12} />
			</g>
			{/* The ferry, arriving. */}
			<g>
				<rect x={140} y={HORIZON + 22} width={28} height={4} fill="#dfe6ef" />
				<rect x={144} y={HORIZON + 18} width={14} height={4} fill="#c9d3df" />
				<rect x={152} y={HORIZON + 15} width={3} height={3} fill="#b3261e" />
				<rect x={138} y={HORIZON + 26} width={32} height={1} fill="#0b1320" />
			</g>
		</svg>
	);
}
