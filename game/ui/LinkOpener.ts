// Opens links offered in dialogue. Browsers only allow window.open inside the actual key
// or pointer event, but Phaser handles input a frame later, so while a "Open …?" choice
// is on screen this listens on window directly and opens the tab synchronously.
const CONFIRM_KEYS = new Set(["e", "E", " ", "Enter", "z", "Z"]);

export type OpenTarget = (url: string) => void;

export const openInBrowser: OpenTarget = (url) => {
	if (url.startsWith("mailto:")) window.location.href = url;
	else window.open(url, "_blank", "noopener,noreferrer");
};

export class LinkOpener {
	private url: string | null = null;
	private opened = false;

	/**
	 * @param isOpenSelected whether the "Open" choice is the one being picked; gets the
	 *   pointer position in client coordinates for taps, nothing for key presses.
	 */
	constructor(
		private readonly isOpenSelected: (clientX?: number, clientY?: number) => boolean,
		private readonly openTarget: OpenTarget = openInBrowser,
	) {
		window.addEventListener("keydown", this.onKey, true);
		window.addEventListener("pointerup", this.onPointer, true);
	}

	/** The "Open …?" choice is showing for this URL. */
	arm(url: string): void {
		this.url = url;
		this.opened = false;
	}

	/** The player chose "Open" (seen by the game loop). Opens now if the DOM event didn't. */
	confirm(): void {
		if (this.url && !this.opened) this.openTarget(this.url); // gamepad: may be blocked
		this.url = null;
	}

	disarm(): void {
		this.url = null;
	}

	destroy(): void {
		window.removeEventListener("keydown", this.onKey, true);
		window.removeEventListener("pointerup", this.onPointer, true);
	}

	private openNow(): void {
		if (!this.url || this.opened) return;
		this.opened = true;
		this.openTarget(this.url);
	}

	private onKey = (e: KeyboardEvent) => {
		if (this.url && CONFIRM_KEYS.has(e.key) && this.isOpenSelected()) this.openNow();
	};

	private onPointer = (e: PointerEvent) => {
		if (this.url && this.isOpenSelected(e.clientX, e.clientY)) this.openNow();
	};
}
