"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function getPrefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia(QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
	const [prefers, setPrefers] = useState(false);

	useEffect(() => {
		const mql = window.matchMedia(QUERY);
		setPrefers(mql.matches);

		const onChange = (e: MediaQueryListEvent) => setPrefers(e.matches);
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return prefers;
}
