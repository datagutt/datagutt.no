// The sound of the town (docs/game/PLAN.md M5.6; DESIGN §15), all synthesised with Web
// Audio: no recordings to load or license. Buses: master into Phaser's output (so the mute
// setting holds), then ambience, effects and music (music comes in v1.1). Ambience layers
// run all the time and glide to the levels mix.ts asks for, so walking about, and through
// doors, crossfades by itself. A recorded CC0 loop can later replace any layer's source.
import type { AudioOutput } from "./sfx";
import { LAYERS, type Layer, type Mix } from "./mix";

/** Loudest each layer gets, before the ambience bus. */
const PEAK: Mix = { waves: 0.3, wind: 0.1, gulls: 0.07, birds: 0.05, fire: 0.22, room: 0.05 };
/** Seconds for a level change to mostly settle: a gentle crossfade. */
const GLIDE = 1.2;

type Graph = { ctx: AudioContext; master: GainNode; buses: { ambience: GainNode; effects: GainNode; music: GainNode }; layers: Record<Layer, GainNode> };

export class Ambience {
	private graph: Graph | null = null;
	private target: Mix = { waves: 0, wind: 0, gulls: 0, birds: 0, fire: 0, room: 0 };
	private timer: ReturnType<typeof setInterval> | null = null;
	private next = { gull: 0, bird: 0, crackle: 0 };

	/** `output` is Phaser's Web Audio context and output, read lazily (it can change). */
	constructor(private readonly output: AudioOutput) {}

	/** Where sound effects should go: the effects bus once audio runs, Phaser's output before. */
	readonly effects: AudioOutput = () => {
		const out = this.output();
		const graph = this.ensure();
		return out && graph ? { context: out.context, destination: graph.buses.effects } : out;
	};

	/** Glide each layer toward a new level. */
	set(mix: Mix): void {
		this.target = mix;
		const graph = this.ensure();
		if (!graph) return;
		for (const layer of LAYERS) graph.layers[layer].gain.setTargetAtTime(mix[layer] * PEAK[layer], graph.ctx.currentTime, GLIDE);
	}

	/** Levels the layers are heading to (for the ?debug readout). */
	get levels(): Mix {
		return this.target;
	}

	/** Build the graph once the context runs (browsers start it only after a gesture). */
	private ensure(): Graph | null {
		if (this.graph) return this.graph;
		const out = this.output();
		if (!out || out.context.state !== "running") return null;
		const ctx = out.context;
		const gain = (value: number, to: AudioNode) => {
			const g = ctx.createGain();
			g.gain.value = value;
			g.connect(to);
			return g;
		};
		const master = gain(1, out.destination);
		const buses = { ambience: gain(0.8, master), effects: gain(1, master), music: gain(0.6, master) };
		const layer = () => gain(0, buses.ambience);
		const layers = { waves: layer(), wind: layer(), gulls: layer(), birds: layer(), fire: layer(), room: layer() };
		this.graph = { ctx, master, buses, layers };
		this.startBeds();
		this.timer = setInterval(() => this.schedule(), 100);
		this.set(this.target);
		return this.graph;
	}

	/** Continuous layers: filtered noise, some swelling slowly. */
	private startBeds(): void {
		const { ctx, layers } = this.graph!;
		const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
		const data = noise.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		const source = (to: AudioNode, filter: BiquadFilterType, frequency: number, q = 0.7) => {
			const src = ctx.createBufferSource();
			src.buffer = noise;
			src.loop = true;
			const f = ctx.createBiquadFilter();
			f.type = filter;
			f.frequency.value = frequency;
			f.Q.value = q;
			src.connect(f).connect(to);
			src.start(ctx.currentTime + Math.random());
			return f;
		};
		const lfo = (param: AudioParam, rate: number, depth: number) => {
			const osc = ctx.createOscillator();
			const amount = ctx.createGain();
			osc.frequency.value = rate;
			amount.gain.value = depth;
			osc.connect(amount).connect(param);
			osc.start();
		};
		// Waves: low rumbling noise that swells and falls like a slow swell on the fjord.
		const swell = ctx.createGain();
		swell.gain.value = 0.6;
		swell.connect(layers.waves);
		source(swell, "lowpass", 420);
		lfo(swell.gain, 0.11, 0.4);
		// Wind: a band of noise whose pitch drifts.
		lfo(source(layers.wind, "bandpass", 520, 0.6).frequency, 0.07, 260);
		// Fire: a low roar under the crackles (scheduled below).
		source(layers.fire, "lowpass", 180);
		// Room: a faint low hum.
		source(layers.room, "lowpass", 120);
	}

	/** Sounds that come and go: gull calls, birdsong, crackles of a fire. */
	private schedule(): void {
		const graph = this.graph;
		if (!graph || graph.ctx.state !== "running") return;
		const now = graph.ctx.currentTime;
		if (this.target.gulls > 0.05 && now > this.next.gull) {
			this.next.gull = now + 7 + Math.random() * 9;
			const calls = 2 + Math.floor(Math.random() * 2);
			for (let i = 0; i < calls; i++) this.gull(now + i * 0.45);
		}
		if (this.target.birds > 0.05 && now > this.next.bird) {
			this.next.bird = now + 1.5 + Math.random() * 4;
			const notes = 2 + Math.floor(Math.random() * 4);
			const pitch = 2400 + Math.random() * 1400;
			for (let i = 0; i < notes; i++) this.chirp(now + i * 0.11, pitch * (1 + (Math.random() - 0.5) * 0.2));
		}
		if (this.target.fire > 0.05 && now > this.next.crackle) {
			this.next.crackle = now + 0.03 + Math.random() * 0.2;
			this.crackle(now);
		}
	}

	private tone(type: OscillatorType, at: number, length: number, to: AudioNode, sweep: [number, number, number], volume: number): void {
		const { ctx } = this.graph!;
		const osc = ctx.createOscillator();
		const env = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(sweep[0], at);
		osc.frequency.linearRampToValueAtTime(sweep[1], at + length * 0.3);
		osc.frequency.exponentialRampToValueAtTime(sweep[2], at + length);
		env.gain.setValueAtTime(0.0001, at);
		env.gain.exponentialRampToValueAtTime(volume, at + 0.02);
		env.gain.exponentialRampToValueAtTime(0.0001, at + length);
		osc.connect(env).connect(to);
		osc.start(at);
		osc.stop(at + length + 0.05);
	}

	/** A herring gull's "kyow": a nasal rise then a long fall. */
	private gull(at: number): void {
		const { ctx, layers } = this.graph!;
		const nasal = ctx.createBiquadFilter();
		nasal.type = "bandpass";
		nasal.frequency.value = 1300;
		nasal.Q.value = 2;
		nasal.connect(layers.gulls);
		this.tone("sawtooth", at, 0.38, nasal, [950, 1450, 700], 0.6);
	}

	private chirp(at: number, pitch: number): void {
		this.tone("sine", at, 0.07, this.graph!.layers.birds, [pitch, pitch * 1.35, pitch * 1.1], 0.5);
	}

	/** One pop of a fire: a tiny burst of bright noise. */
	private crackle(at: number): void {
		const { ctx, layers } = this.graph!;
		const length = Math.floor(ctx.sampleRate * (0.004 + Math.random() * 0.01));
		const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
		const src = ctx.createBufferSource();
		src.buffer = buffer;
		const f = ctx.createBiquadFilter();
		f.type = "highpass";
		f.frequency.value = 1800;
		const env = ctx.createGain();
		env.gain.value = 0.4 + Math.random() * 0.8;
		src.connect(f).connect(env).connect(layers.fire);
		src.start(at);
	}

	destroy(): void {
		if (this.timer) clearInterval(this.timer);
		this.graph?.master.disconnect();
		this.graph = null;
	}
}
