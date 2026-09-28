// Small synthesised sound effects (apps/datagutt/docs/DESIGN.md §15: effects are made in code).
// Same output rule as blips: read Phaser's Web Audio context lazily, it can change.

export type AudioOutput = () => { context: AudioContext; destination: AudioNode } | null;

function running(output: AudioOutput) {
	const out = output();
	return out && out.context.state === "running" ? out : null;
}

/** A rubber stamp hitting paper: a low thump plus a short burst of noise. */
export function playStamp(output: AudioOutput): void {
	const out = running(output);
	if (!out) return;
	const { context: ctx, destination } = out;
	const now = ctx.currentTime;

	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = "sine";
	osc.frequency.setValueAtTime(180, now);
	osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);
	gain.gain.setValueAtTime(0.35, now);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
	osc.connect(gain).connect(destination);
	osc.start(now);
	osc.stop(now + 0.2);

	const length = Math.floor(ctx.sampleRate * 0.06);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
	const noise = ctx.createBufferSource();
	const noiseGain = ctx.createGain();
	noise.buffer = buffer;
	noiseGain.gain.value = 0.12;
	noise.connect(noiseGain).connect(destination);
	noise.start(now);
}

/** Paper rustle for opening the passport. */
export function playPaper(output: AudioOutput): void {
	const out = running(output);
	if (!out) return;
	const { context: ctx, destination } = out;
	const length = Math.floor(ctx.sampleRate * 0.12);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / length) * 0.5;
	const src = ctx.createBufferSource();
	const filter = ctx.createBiquadFilter();
	const gain = ctx.createGain();
	src.buffer = buffer;
	filter.type = "highpass";
	filter.frequency.value = 2000;
	gain.gain.value = 0.08;
	src.connect(filter).connect(gain).connect(destination);
	src.start();
}

/** A soft click for moving through menus. */
export function playTick(output: AudioOutput, pitch = 880): void {
	const out = running(output);
	if (!out) return;
	const { context: ctx, destination } = out;
	const now = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = "square";
	osc.frequency.value = pitch;
	gain.gain.setValueAtTime(0.03, now);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
	osc.connect(gain).connect(destination);
	osc.start(now);
	osc.stop(now + 0.05);
}

/** A soft low thud for walking into something. */
export function playBump(output: AudioOutput): void {
	const out = running(output);
	if (!out) return;
	const { context: ctx, destination } = out;
	const now = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = "triangle";
	osc.frequency.setValueAtTime(140, now);
	osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
	gain.gain.setValueAtTime(0.08, now);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
	osc.connect(gain).connect(destination);
	osc.start(now);
	osc.stop(now + 0.12);
}
