"use client";

// Keyboard for a title screen: on the splash any key opens the menu; in the menu the arrow
// keys move between items marked `data-menu-item` and Escape goes back. Buttons and links
// do the rest, so Tab and Enter work as on any page.
import { useEffect, type RefObject } from "react";

export function useMenuKeys(options: {
	/** Off while the game is being played. */
	enabled: boolean;
	/** The splash ("Press start") is showing. */
	splash: boolean;
	menuRef: RefObject<HTMLElement | null>;
	openMenu(): void;
	back(): void;
}) {
	const { enabled, splash, menuRef, openMenu, back } = options;
	useEffect(() => {
		if (!enabled) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (splash) {
				// Tab moves focus, and Enter on a focused link follows it.
				if (e.key === "Tab" || document.activeElement instanceof HTMLAnchorElement) return;
				e.preventDefault();
				openMenu();
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				back();
				return;
			}
			if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
			const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? [])];
			if (!items.length) return;
			e.preventDefault();
			const at = items.indexOf(document.activeElement as HTMLElement);
			const step = e.key === "ArrowDown" ? 1 : -1;
			items[(at + step + items.length) % items.length].focus();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [enabled, splash, menuRef, openMenu, back]);
}
