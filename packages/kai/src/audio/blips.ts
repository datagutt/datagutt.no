// Undertale-style dialogue blips: a short synthesised tone per revealed letter, with a
// distinct voice per character (GameData.voiceFor). Plays through Phaser's Web Audio
// context so it shares the browser's audio unlock and the master mute.
import type { Voice } from "../data.ts";

export type { Voice };

/** Whether revealing `text[index]` should make a sound: letters and digits only, spaced out. */
export function shouldBlip(text: string, index: number, every: number): boolean {
	const ch = text[index] ?? "";
	if (!/[\p{L}\p{N}]/u.test(ch)) return false;
	// Count letters so far, so spaces and punctuation don't shift the rhythm.
	let letters = 0;
	for (let i = 0; i <= index; i++) if (/[\p{L}\p{N}]/u.test(text[i])) letters++;
	return letters % every === 1 || every === 1;
}

export class BlipPlayer {
	/** Blips actually played, for the ?debug readout and tests. */
	played = 0;

	/**
	 * `output` is read on every blip: Phaser can swap its AudioContext after startup
	 * (when audio unlocks), so a captured context may be a stale, suspended one.
	 */
	constructor(
		private readonly output: () => { context: AudioContext; destination: AudioNode } | null,
		private readonly random: () => number = Math.random,
	) {}

	play(voice: Voice): void {
		const out = this.output();
		const ctx = out?.context;
		if (!out || !ctx || ctx.state !== "running") return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = voice.wave;
		osc.frequency.value = voice.pitch * (1 + (this.random() * 2 - 1) * voice.variance);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(voice.volume, now + 0.005);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
		osc.connect(gain).connect(out.destination);
		osc.start(now);
		osc.stop(now + 0.07);
		this.played++;
	}
}
