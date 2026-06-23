"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useReactionsSocket } from "../../hooks/useReactionsSocket";
import { findClosestSection } from "../../lib/reactions/sections";
import type {
	ReactionEvent,
	ReactionPayload,
	ReactionType,
} from "../../lib/reactions/types";
import ReactionLayer, { type ActiveDrop } from "./ReactionLayer";
import ReactionPalette from "./ReactionPalette";
import ReactionSprites from "./sprites";

const LIFETIME_MS = 2000;
const HOLD_THRESHOLD_MS = 220;
const MOVE_CANCEL_PX = 8;
const KILL_SWITCH_KEY = "rx_off";

type PaletteState = {
	clientX: number;
	clientY: number;
	sectionId: ReactionPayload["sectionId"];
	normalizedX: number;
	normalizedY: number;
};

const isInteractive = (target: EventTarget | null): boolean => {
	if (!(target instanceof Element)) return false;
	if (target.closest("[data-no-reactions]")) return true;
	if (
		target.closest(
			'a, button, input, textarea, select, [role="button"], [contenteditable="true"]',
		)
	) {
		return true;
	}
	return false;
};

export default function ReactionsOverlay() {
	const reducedMotion = usePrefersReducedMotion();
	const [drops, setDrops] = useState<ActiveDrop[]>([]);
	const [palette, setPalette] = useState<PaletteState | null>(null);
	const [killed, setKilled] = useState(false);
	const paletteRef = useRef<PaletteState | null>(null);
	paletteRef.current = palette;

	useEffect(() => {
		try {
			setKilled(localStorage.getItem(KILL_SWITCH_KEY) === "1");
		} catch {
			// noop
		}
	}, []);

	const addDrop = useCallback((d: ActiveDrop) => {
		setDrops((prev) => {
			if (prev.some((p) => p.id === d.id)) return prev;
			return [...prev, d];
		});
		window.setTimeout(() => {
			setDrops((prev) => prev.filter((p) => p.id !== d.id));
		}, LIFETIME_MS);
	}, []);

	const handleRemote = useCallback(
		(event: ReactionEvent) => {
			addDrop({
				id: event.id,
				type: event.type,
				sectionId: event.sectionId,
				nx: event.normalizedX,
				ny: event.normalizedY,
			});
		},
		[addDrop],
	);

	const send = useReactionsSocket(handleRemote, !killed);

	const sendReaction = useCallback(
		(payload: ReactionPayload, optimisticId: string) => {
			addDrop({
				id: optimisticId,
				type: payload.type,
				sectionId: payload.sectionId,
				nx: payload.normalizedX,
				ny: payload.normalizedY,
			});
			send(payload);
		},
		[addDrop, send],
	);

	const localId = useCallback(() => `local-${crypto.randomUUID()}`, []);

	const dropRipple = useCallback(
		(p: PaletteState) => {
			sendReaction(
				{
					sectionId: p.sectionId,
					normalizedX: p.normalizedX,
					normalizedY: p.normalizedY,
					type: "ripple" satisfies ReactionType,
				},
				localId(),
			);
		},
		[sendReaction, localId],
	);

	const handlePick = useCallback(
		(type: Exclude<ReactionType, "ripple">) => {
			const anchor = paletteRef.current;
			setPalette(null);
			if (!anchor) return;
			sendReaction(
				{
					sectionId: anchor.sectionId,
					normalizedX: anchor.normalizedX,
					normalizedY: anchor.normalizedY,
					type,
				},
				localId(),
			);
		},
		[sendReaction, localId],
	);

	useEffect(() => {
		if (killed) return;

		let pressedAt = 0;
		let pressedXY: { x: number; y: number } | null = null;
		let pendingAnchor: PaletteState | null = null;
		let holdTimer: number | null = null;
		let holdFired = false;

		const clearHold = () => {
			if (holdTimer !== null) {
				window.clearTimeout(holdTimer);
				holdTimer = null;
			}
		};

		const onPointerDown = (e: PointerEvent) => {
			if (e.button !== 0) return;
			if (isInteractive(e.target)) return;
			if (paletteRef.current) return;
			if (reducedMotion) {
				const located = findClosestSection(e.clientX, e.clientY);
				if (located) {
					dropRipple({
						clientX: e.clientX,
						clientY: e.clientY,
						sectionId: located.sectionId,
						normalizedX: located.normalizedX,
						normalizedY: located.normalizedY,
					});
				}
				return;
			}

			const located = findClosestSection(e.clientX, e.clientY);
			if (!located) return;

			pressedAt = performance.now();
			pressedXY = { x: e.clientX, y: e.clientY };
			holdFired = false;
			pendingAnchor = {
				clientX: e.clientX,
				clientY: e.clientY,
				sectionId: located.sectionId,
				normalizedX: located.normalizedX,
				normalizedY: located.normalizedY,
			};

			holdTimer = window.setTimeout(() => {
				holdFired = true;
				holdTimer = null;
				if (pendingAnchor) setPalette(pendingAnchor);
			}, HOLD_THRESHOLD_MS);
		};

		const onPointerMove = (e: PointerEvent) => {
			if (!pressedXY || holdTimer === null) return;
			const dx = e.clientX - pressedXY.x;
			const dy = e.clientY - pressedXY.y;
			if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
				clearHold();
				pendingAnchor = null;
				pressedXY = null;
			}
		};

		const onPointerUp = () => {
			if (pendingAnchor && !holdFired && performance.now() - pressedAt < HOLD_THRESHOLD_MS) {
				dropRipple(pendingAnchor);
			}
			clearHold();
			pendingAnchor = null;
			pressedXY = null;
		};

		const onPointerCancel = () => {
			clearHold();
			pendingAnchor = null;
			pressedXY = null;
		};

		const onContextMenu = (e: Event) => {
			if (holdFired) e.preventDefault();
		};

		window.addEventListener("pointerdown", onPointerDown, { capture: true });
		window.addEventListener("pointermove", onPointerMove, { passive: true });
		window.addEventListener("pointerup", onPointerUp, { passive: true });
		window.addEventListener("pointercancel", onPointerCancel, {
			passive: true,
		});
		window.addEventListener("contextmenu", onContextMenu);
		return () => {
			clearHold();
			window.removeEventListener("pointerdown", onPointerDown, {
				capture: true,
			});
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerCancel);
			window.removeEventListener("contextmenu", onContextMenu);
		};
	}, [killed, reducedMotion, dropRipple]);

	if (killed) return null;

	return (
		<>
			<ReactionSprites />
			<div
				role="presentation"
				aria-hidden="true"
				className="pointer-events-none fixed inset-0 z-[60]"
			>
				<ReactionLayer drops={drops} reducedMotion={reducedMotion} />
				{palette && (
					<ReactionPalette
						x={palette.clientX}
						y={palette.clientY}
						onPick={handlePick}
						onClose={() => setPalette(null)}
					/>
				)}
			</div>
		</>
	);
}
