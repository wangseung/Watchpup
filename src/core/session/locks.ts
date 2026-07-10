/**
 * 키(스레드)별 직렬 실행 락. 하나의 책임: 같은 스레드 요청을 순서대로 처리.
 */
export class KeyedMutex {
  private tails = new Map<string, Promise<unknown>>()

  /** key에 대해 fn을 직렬로 실행 (같은 key의 이전 작업 완료 후 시작) */
  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.tails.get(key) ?? Promise.resolve()
    // 이전 작업이 성공/실패 어느 쪽이든 그 다음에 fn 실행
    const result = prev.then(fn, fn) as Promise<T>
    // tail은 절대 reject되지 않도록 하여 체인이 끊기지 않게 함
    const tail = result.then(
      () => undefined,
      () => undefined,
    )
    this.tails.set(key, tail)
    // 내가 마지막 작업이면 정리 (메모리 누수 방지)
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key)
    })
    return result
  }

  /** 현재 대기/실행 중인 key 수 */
  get size(): number {
    return this.tails.size
  }
}
