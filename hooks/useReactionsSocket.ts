"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ReactionEvent, ReactionPayload } from "../lib/reactions/types";

const WS_PATH = "/api/reactions/ws";
const MAX_OUTBOX = 10;
const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

function socketUrl(): string {
	const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
	return `${proto}//${window.location.host}${WS_PATH}`;
}

export function useReactionsSocket(
	onEvent: (event: ReactionEvent) => void,
	enabled = true,
): (payload: ReactionPayload) => void {
	const handlerRef = useRef(onEvent);
	useEffect(() => {
		handlerRef.current = onEvent;
	}, [onEvent]);

	const socketRef = useRef<WebSocket | null>(null);
	// Buffers sends issued while the socket is down. Flushed on open, dropping
	// the oldest beyond MAX_OUTBOX so a long outage can't grow unbounded.
	const outboxRef = useRef<string[]>([]);

	useEffect(() => {
		if (!enabled || typeof window === "undefined") return;

		let closed = false;
		let reconnectDelay = INITIAL_RECONNECT_MS;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

		const open = () => {
			if (closed || socketRef.current) return;

			const ws = new WebSocket(socketUrl());
			socketRef.current = ws;

			ws.onopen = () => {
				reconnectDelay = INITIAL_RECONNECT_MS;
				const outbox = outboxRef.current;
				outboxRef.current = [];
				for (const msg of outbox) {
					try {
						ws.send(msg);
					} catch {
						// noop
					}
				}
			};

			ws.onmessage = (e) => {
				if (typeof e.data !== "string") return;
				try {
					handlerRef.current(JSON.parse(e.data) as ReactionEvent);
				} catch {
					// noop
				}
			};

			ws.onclose = () => {
				socketRef.current = null;
				if (closed || document.visibilityState !== "visible") return;
				reconnectTimer = setTimeout(open, reconnectDelay);
				reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);
			};

			ws.onerror = () => {
				ws.close();
			};
		};

		const onVisibility = () => {
			if (document.visibilityState === "hidden") {
				socketRef.current?.close();
				socketRef.current = null;
			} else if (!socketRef.current) {
				open();
			}
		};

		document.addEventListener("visibilitychange", onVisibility);
		open();

		return () => {
			closed = true;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			document.removeEventListener("visibilitychange", onVisibility);
			socketRef.current?.close();
			socketRef.current = null;
		};
	}, [enabled]);

	return useCallback((payload: ReactionPayload) => {
		const msg = JSON.stringify(payload);
		const ws = socketRef.current;
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(msg);
			return;
		}
		const outbox = outboxRef.current;
		outbox.push(msg);
		if (outbox.length > MAX_OUTBOX) outbox.shift();
	}, []);
}
