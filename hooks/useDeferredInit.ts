import { useEffect, useState, useTransition } from "react";

/**
 * Defers heavy initialization work (e.g. ScrollTrigger setup) as a
 * low-priority transition so it doesn't block the main thread during
 * the Hero entrance animation.
 */
export function useDeferredInit() {
	const [ready, setReady] = useState(false);
	const [, startTransition] = useTransition();

	useEffect(() => {
		startTransition(() => setReady(true));
	}, [startTransition]);

	return ready;
}
