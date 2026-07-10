import { describe, it, expect } from 'vitest'
import { decideIngest } from './ingest-filter.js'

const NOW = 1_783_000_000_000 // 고정 기준시각(ms)
const tsDaysAgo = (d: number) => String((NOW - d * 86_400_000) / 1000)

describe('decideIngest', () => {
  it('이미 본 메시지는 제외(dedup), markSeen 안 함', () => {
    const r = decideIngest({ messageTs: tsDaysAgo(0), nowMs: NOW, maxAgeDays: 7, alreadySeen: true, alreadyTracked: false })
    expect(r).toEqual({ ingest: false, reason: 'dedup', markSeen: false })
  })
  it('최근 메시지는 수집', () => {
    const r = decideIngest({ messageTs: tsDaysAgo(1), nowMs: NOW, maxAgeDays: 7, alreadySeen: false, alreadyTracked: false })
    expect(r).toEqual({ ingest: true, markSeen: true })
  })
  it('컷오프보다 오래된 메시지는 제외하되 markSeen', () => {
    const r = decideIngest({ messageTs: tsDaysAgo(10), nowMs: NOW, maxAgeDays: 7, alreadySeen: false, alreadyTracked: false })
    expect(r).toEqual({ ingest: false, reason: 'too-old', markSeen: true })
  })
  it('오래됐어도 이미 추적 중인 스레드는 통과', () => {
    const r = decideIngest({ messageTs: tsDaysAgo(30), nowMs: NOW, maxAgeDays: 7, alreadySeen: false, alreadyTracked: true })
    expect(r.ingest).toBe(true)
  })
  it('maxAgeDays=0이면 나이 제한 없음', () => {
    const r = decideIngest({ messageTs: tsDaysAgo(365), nowMs: NOW, maxAgeDays: 0, alreadySeen: false, alreadyTracked: false })
    expect(r.ingest).toBe(true)
  })
  it('경계: 정확히 컷오프 경계면 통과(초과만 제외)', () => {
    const r = decideIngest({ messageTs: tsDaysAgo(7), nowMs: NOW, maxAgeDays: 7, alreadySeen: false, alreadyTracked: false })
    expect(r.ingest).toBe(true)
  })
})
