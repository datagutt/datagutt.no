"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useReactionsStream } from "../../hooks/useReactionsStream";
import { useSessionId } from "../../hooks/useSessionId";
import { findClosestSection } from "../../lib/reactions/sections";
import type {
	ReactionEvent,
	ReactionPayload,
	ReactionType,
} from "../../lib/reactions/types";
import ReactionLayer, { type ActiveDrop } from "./ReactionLayer";

const LIFETIME_MS = 2000;
const KILL_SWITCH_KEY = "rx_off";

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
	const sid = useSessionId();
	const [drops, setDrops] = useState<ActiveDrop[]>([]);
	const [killed, setKilled] = useState(false);
	const dropsRef = useRef<ActiveDrop[]>([]);
	dropsRef.current = drops;

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
			if (sid && event.sid === sid) return; // already drew our own optimistically
			addDrop({
				id: event.id,
				type: event.type,
				sectionId: event.sectionId,
				nx: event.normalizedX,
				ny: event.normalizedY,
			});
		},
		[addDrop, sid],
	);

	useReactionsStream(handleRemote, !killed);

	const sendReaction = useCallback(
		async (payload: ReactionPayload, optimisticId: string) => {
			addDrop({
				id: optimisticId,
				type: payload.type,
				sectionId: payload.sectionId,
				nx: payload.normalizedX,
				ny: payload.normalizedY,
			});
			try {
				await fetch("/api/reactions", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
			} catch {
				// silent — drop already shown locally
			}
		},
		[addDrop],
	);

	useEffect(() => {
		if (killed) return;

		const onPointerDown = (e: PointerEvent) => {
			if (e.button !== 0) return;
			if (isInteractive(e.target)) return;

			const located = findClosestSection(e.clientX, e.clientY);
			if (!located) return;

			const id =
				typeof crypto !== "undefined" && "randomUUID" in crypto
					? `local-${crypto.randomUUID()}`
					: `local-${Date.now()}-${Math.random()}`;

			void sendReaction(
				{
					sectionId: located.sectionId,
					normalizedX: located.normalizedX,
					normalizedY: located.normalizedY,
					type: "ripple" satisfies ReactionType,
				},
				id,
			);
		};

		window.addEventListener("pointerdown", onPointerDown, { capture: true });
		return () => {
			window.removeEventListener("pointerdown", onPointerDown, {
				capture: true,
			});
		};
	}, [killed, sendReaction]);

	if (killed) return null;

	return (
		<div
			role="presentation"
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 z-[60]"
		>
			<ReactionLayer drops={drops} reducedMotion={reducedMotion} />
		</div>
	);
}
