// A WebSocket that comes back: reconnects after every close, waiting longer each time
// until a connection proves itself (the owner calls `healthy()`). Shared by the Lanyard
// and world sockets.

/** The part of WebSocket the clients use, so tests can pass a fake. */
export type SocketLike = {
	send(data: string): void;
	close(): void;
	readonly readyState?: number;
	onopen: (() => void) | null;
	onmessage: ((event: { data: unknown }) => void) | null;
	onclose: (() => void) | null;
	onerror: (() => void) | null;
};

export const browserSocket = (url: string) => new WebSocket(url) as unknown as SocketLike;

/** WebSocket.OPEN, which fakes and non-browser code may not define. */
export const OPEN = 1;

export type RetryDelays = { first: number; max: number };

export class Reconnecting {
	private socket: SocketLike | null = null;
	private retry: ReturnType<typeof setTimeout> | null = null;
	private delay: number;
	private stopped = true;

	constructor(
		private readonly url: string,
		/** Wire up a new socket; its onclose and onerror belong to this class. */
		private readonly attach: (socket: SocketLike) => void,
		/** The socket closed; clear anything tied to it (timers). */
		private readonly detach: () => void = () => {},
		private readonly createSocket: (url: string) => SocketLike = browserSocket,
		private readonly delays: RetryDelays = { first: 1_000, max: 60_000 },
	) {
		this.delay = delays.first;
	}

	get current(): SocketLike | null {
		return this.socket;
	}

	start(): void {
		if (!this.stopped) return;
		this.stopped = false;
		this.connect();
	}

	stop(): void {
		this.stopped = true;
		if (this.retry) clearTimeout(this.retry);
		this.retry = null;
		const socket = this.socket;
		this.socket = null;
		this.detach();
		socket?.close();
	}

	/** The connection works: the next reconnect starts from the shortest delay again. */
	healthy(): void {
		this.delay = this.delays.first;
	}

	private connect(): void {
		let socket: SocketLike;
		try {
			socket = this.createSocket(this.url);
		} catch {
			this.scheduleRetry();
			return;
		}
		this.socket = socket;
		this.attach(socket);
		socket.onclose = () => {
			if (this.socket !== socket) return;
			this.socket = null;
			this.detach();
			this.scheduleRetry();
		};
		socket.onerror = () => socket.close();
	}

	private scheduleRetry(): void {
		if (this.stopped) return;
		this.retry = setTimeout(() => {
			this.retry = null;
			if (!this.stopped) this.connect();
		}, this.delay);
		this.delay = Math.min(this.delay * 2, this.delays.max);
	}
}
