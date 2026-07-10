/**
 * 전역 동시성 제한 세마포어. 하나의 책임: 동시 실행 슬롯 관리.
 */
export class Semaphore {
  private active = 0
  private queue: Array<() => void> = []

  constructor(private readonly max: number) {}

  get activeCount(): number {
    return this.active
  }
  get pendingCount(): number {
    return this.queue.length
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++
      return Promise.resolve()
    }
    return new Promise<void>((res) => this.queue.push(res))
  }

  private release(): void {
    this.active--
    const next = this.queue.shift()
    if (next) {
      this.active++
      next()
    }
  }

  /** fn을 슬롯 확보 후 실행하고, 끝나면 슬롯 반환 */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }
}
