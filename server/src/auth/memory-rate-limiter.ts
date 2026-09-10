export class MemoryRateLimiter {
  private readonly hits = new Map<string, number[]>()

  constructor(private readonly max: number, private readonly windowMs: number) {}

  consume(key: string, now = Date.now()): boolean {
    const cutoff = now - this.windowMs
    const list = (this.hits.get(key) ?? []).filter((t) => t > cutoff)
    if (list.length >= this.max) {
      this.hits.set(key, list)
      return false
    }
    list.push(now)
    this.hits.set(key, list)
    return true
  }
}
