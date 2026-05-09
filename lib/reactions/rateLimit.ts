type Bucket = { tokens: number; last: number };

const CAPACITY = 5;
const REFILL_PER_SEC = 1;
const GC_AGE_MS = 60_000;

declare global {
	// eslint-disable-next-line no-var
	var __rx_buckets: Map<string, Bucket> | undefined;
}

const buckets: Map<string, Bucket> =
	globalThis.__rx_buckets ?? (globalThis.__rx_buckets = new Map());

let lastGc = 0;

function gc(now: number) {
	if (now - lastGc < GC_AGE_MS) return;
	lastGc = now;
	for (const [k, v] of buckets) {
		if (now - v.last > GC_AGE_MS) buckets.delete(k);
	}
}

export function consume(sid: string): boolean {
	const now = Date.now();
	gc(now);

	let b = buckets.get(sid);
	if (!b) {
		b = { tokens: CAPACITY, last: now };
		buckets.set(sid, b);
	} else {
		const elapsed = (now - b.last) / 1000;
		b.tokens = Math.min(CAPACITY, b.tokens + elapsed * REFILL_PER_SEC);
		b.last = now;
	}

	if (b.tokens < 1) return false;
	b.tokens -= 1;
	return true;
}
