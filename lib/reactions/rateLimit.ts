const CAPACITY = 5;
const REFILL_PER_SEC = 1;

export type TokenBucket = { consume(): boolean };

// One bucket per WebSocket connection. The connection's lifetime bounds the
// bucket, so there's no shared map to garbage-collect like the old per-cookie
// approach needed.
export function createTokenBucket(): TokenBucket {
	let tokens = CAPACITY;
	let last = Date.now();

	return {
		consume(): boolean {
			const now = Date.now();
			const elapsed = (now - last) / 1000;
			tokens = Math.min(CAPACITY, tokens + elapsed * REFILL_PER_SEC);
			last = now;
			if (tokens < 1) return false;
			tokens -= 1;
			return true;
		},
	};
}
