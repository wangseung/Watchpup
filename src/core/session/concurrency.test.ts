import { describe, it, expect } from 'vitest'
import { Semaphore } from './semaphore.js'
import { KeyedMutex } from './locks.js'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Semaphore', () => {
  it('동시 실행을 max로 제한', async () => {
    const sem = new Semaphore(2)
    let peak = 0
    let cur = 0
    const task = async () => {
      cur++
      peak = Math.max(peak, cur)
      await delay(20)
      cur--
    }
    await Promise.all(Array.from({ length: 6 }, () => sem.run(task)))
    expect(peak).toBeLessThanOrEqual(2)
  })
})

describe('KeyedMutex', () => {
  it('같은 키는 직렬, 순서 보존', async () => {
    const m = new KeyedMutex()
    const order: number[] = []
    await Promise.all([
      m.run('k', async () => { await delay(30); order.push(1) }),
      m.run('k', async () => { await delay(5); order.push(2) }),
      m.run('k', async () => { await delay(1); order.push(3) }),
    ])
    expect(order).toEqual([1, 2, 3])
  })
  it('다른 키는 병렬', async () => {
    const m = new KeyedMutex()
    const start = Date.now()
    await Promise.all([
      m.run('a', () => delay(30)),
      m.run('b', () => delay(30)),
    ])
    expect(Date.now() - start).toBeLessThan(55)
  })
  it('에러가 나도 체인 유지', async () => {
    const m = new KeyedMutex()
    await expect(m.run('k', async () => { throw new Error('boom') })).rejects.toThrow('boom')
    await expect(m.run('k', async () => 'ok')).resolves.toBe('ok')
  })
})
