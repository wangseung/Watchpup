import { describe, expect, it } from 'vitest'
import { naggingLine, nextNaggingDelayMs, pickNaggingWorkItem } from './nagging.js'
import type { WorkItem } from '../work/types.js'

function item(id: string, title = id): WorkItem {
  return { id, title, notes: '', listId: 'list', listName: 'Work', account: 'iCloud', completed: false, childIds: [], depth: 0, links: [] }
}

describe('nagging presentation', () => {
  it('설정 범위 안에서 다음 잔소리 시각을 무작위로 정한다', () => {
    expect(nextNaggingDelayMs(5, 12, () => 0)).toBe(5 * 60_000)
    expect(nextNaggingDelayMs(5, 12, () => 0.5)).toBe(8.5 * 60_000)
    expect(nextNaggingDelayMs(12, 5, () => 0.9)).toBe(12 * 60_000)
  })

  it('최근 열어본 작업을 우선하고 직전 작업은 가능한 경우 피한다', () => {
    const now = Date.now()
    const items = [item('a'), item('b'), item('c')]
    const picked = pickNaggingWorkItem(items, { a: now - 1000, b: now - 2000 }, 'a', now, () => 0)
    expect(picked?.id).toBe('b')
  })

  it('작업이 없으면 일반 잔소리를 만든다', () => {
    expect(naggingLine(null, () => 0)).toBe('지금 벌여둔 작업 중 하나 잊은 건 없어요?')
  })
})
