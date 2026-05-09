"use client";

import { useEffect, useRef } from "react";
import type { ReactionEvent } from "../lib/reactions/types";

const STREAM_URL = "/api/reactions/stream";

export function useReactionsStream(
	onEvent: (event: ReactionEvent) => void,
	enabled = true,
) {
	const handlerRef = useRef(onEvent);
	useEffect(() => {
		handlerRef.current = onEvent;
	}, [onEvent]);

	useEffect(() => {
		if (!enabled || typeof window === "undefined") return;

		let source: EventSource | null = null;
		let closed = false;

		const open = () => {
			if (closed) return;
			source = new EventSource(STREAM_URL);
			source.onmessage = (e) => {
				if (!e.data) return;
				try {
					const parsed = JSON.parse(e.data) as ReactionEvent;
					handlerRef.current(parsed);
				} catch {
					// noop
				}
			};
			source.onerror = () => {
				source?.close();
				source = null;
				if (!closed && document.visibilityState === "visible") {
					setTimeout(open, 1500);
				}
			};
		};

		const onVisibility = () => {
			if (document.visibilityState === "hidden") {
				source?.close();
				source = null;
			} else if (!source) {
				open();
			}
		};

		document.addEventListener("visibilitychange", onVisibility);
		open();

		return () => {
			closed = true;
			document.removeEventListener("visibilitychange", onVisibility);
			source?.close();
			source = null;
		};
	}, [enabled]);
}
