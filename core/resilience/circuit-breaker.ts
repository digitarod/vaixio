export type CircuitState = "closed" | "open" | "half_open";

const FAILURE_THRESHOLD = 5;
const OPEN_COOLDOWN_MS = 30_000;

/**
 * §6.5: 連続失敗したコネクタを degraded 扱いにして隔離する。
 * 1コネクタの障害が他のコネクタを巻き込まないための最小限の実装。
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt = 0;

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "closed";
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= FAILURE_THRESHOLD) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }

  isCallAllowed(): boolean {
    if (this.state !== "open") return true;
    if (Date.now() - this.openedAt >= OPEN_COOLDOWN_MS) {
      this.state = "half_open";
      return true;
    }
    return false;
  }

  getState(): CircuitState {
    return this.state;
  }
}

export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>();

  for(namespace: string): CircuitBreaker {
    let breaker = this.breakers.get(namespace);
    if (!breaker) {
      breaker = new CircuitBreaker();
      this.breakers.set(namespace, breaker);
    }
    return breaker;
  }

  snapshot(): Record<string, CircuitState> {
    return Object.fromEntries([...this.breakers.entries()].map(([k, v]) => [k, v.getState()]));
  }
}

export const circuitBreakers = new CircuitBreakerRegistry();
