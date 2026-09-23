// Undertale-style dialogue blips (docs/game/PLAN.md M2.6): a short synthesised tone per
// revealed letter, with a distinct voice per character. Plays through Phaser's Web Audio
// context so it shares the browser's audio unlock and the master mute.
import { npc } from "../npcs";

export type Voice = {
	wave: OscillatorType;
	/** Base pitch in Hz. */
	pitch: number;
	/** Random pitch spread, as a fraction of the base (0.1 = ±10%). */
	variance: number;
	volume: number;
	/** Blip on every n-th letter. */
	every: number;
};

export const DEFAULT_VOICE: Voice = { wave: "square", pitch: 440, variance: 0.06, volume: 0.05, every: 2 };

/** A character's voice from the NPC roster, or the default. */
export function voiceFor(character: string | null): Voice {
	return (character && npc(character)?.voice) || DEFAULT_VOICE;
}

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
