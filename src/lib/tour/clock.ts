/** Thrown into pending waits when a run is cancelled (replay, unmount). */
export class TourAborted extends Error {
  constructor() {
    super("Tour aborted");
  }
}

interface Waiter {
  until: number;
  resolve: () => void;
  reject: (error: Error) => void;
  onFrame?: ((elapsed: number) => void) | undefined;
  from: number;
}

/**
 * A pausable clock driven by requestAnimationFrame. Time only advances while playing, so
 * pausing a tour freezes every wait and animation exactly where it is.
 */
export class TourClock {
  #elapsed = 0;
  #last: number | undefined;
  #playing = false;
  #frame = 0;
  #waiters = new Set<Waiter>();
  #now: () => number;
  #raf: (cb: (t: number) => void) => number;
  #caf: (id: number) => void;

  constructor(
    now: () => number = () => performance.now(),
    raf: (cb: (t: number) => void) => number = (cb) => requestAnimationFrame(cb),
    caf: (id: number) => void = (id) => cancelAnimationFrame(id),
  ) {
    this.#now = now;
    this.#raf = raf;
    this.#caf = caf;
  }

  get elapsed(): number {
    return this.#elapsed;
  }

  get playing(): boolean {
    return this.#playing;
  }

  play(): void {
    if (this.#playing) return;
    this.#playing = true;
    this.#last = this.#now();
    this.#frame = this.#raf(this.#tick);
  }

  pause(): void {
    if (!this.#playing) return;
    this.#advance();
    this.#playing = false;
    this.#caf(this.#frame);
  }

  /** Stops the clock, rejects all pending waits and resets time to zero. */
  reset(): void {
    this.pause();
    for (const waiter of this.#waiters) waiter.reject(new TourAborted());
    this.#waiters.clear();
    this.#elapsed = 0;
  }

  /** Resolves after `ms` of playing time. `onFrame` receives progress from 0 to 1. */
  wait(ms: number, onFrame?: (progress: number) => void): Promise<void> {
    if (ms <= 0) {
      onFrame?.(1);
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const from = this.#elapsed;
      this.#waiters.add({
        until: from + ms,
        from,
        resolve,
        reject,
        onFrame: onFrame && ((elapsed) => onFrame(Math.min(1, (elapsed - from) / ms))),
      });
    });
  }

  #advance(): void {
    const now = this.#now();
    if (this.#last !== undefined) this.#elapsed += now - this.#last;
    this.#last = now;
  }

  /** Advances time and settles waits. Public for tests; normally driven by rAF. */
  tick(): void {
    if (!this.#playing) return;
    this.#advance();
    for (const waiter of [...this.#waiters]) {
      waiter.onFrame?.(this.#elapsed);
      if (this.#elapsed >= waiter.until) {
        this.#waiters.delete(waiter);
        waiter.resolve();
      }
    }
  }

  #tick = () => {
    if (!this.#playing) return;
    this.tick();
    this.#frame = this.#raf(this.#tick);
  };
}
