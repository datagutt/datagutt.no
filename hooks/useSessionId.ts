"use client";

import { useEffect, useState } from "react";

const KEY = "rx_sid";

function uuid(): string {
	return crypto.randomUUID();
}

function ensureCookie(sid: string) {
	if (typeof document === "undefined") return;
	const existing = document.cookie
		.split(";")
		.find((c) => c.trim().startsWith(`${KEY}=`));
	if (existing) return;
	const oneYear = 60 * 60 * 24 * 365;
	document.cookie = `${KEY}=${sid}; path=/; max-age=${oneYear}; samesite=lax`;
}

export function useSessionId(): string | null {
	const [sid, setSid] = useState<string | null>(null);

	useEffect(() => {
		try {
			let value = localStorage.getItem(KEY);
			if (!value) {
				value = uuid();
				localStorage.setItem(KEY, value);
			}
			ensureCookie(value);
			setSid(value);
		} catch {
			const fallback = uuid();
			ensureCookie(fallback);
			setSid(fallback);
		}
	}, []);

	return sid;
}
