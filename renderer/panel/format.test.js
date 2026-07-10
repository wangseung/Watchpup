import { describe, it, expect } from 'vitest'
import {
  shortText, relativeTime, shortRef, debugRef, matchesQuery, hasOpenTodos,
  fmtMsgTime, authorColor, weekStart, lessonKeyLabel, CAT_ORDER, CAT_LABEL,
} from './format.js'

describe('shortText', () => {
  it('n 초과면 말줄임', () => {
    expect(shortText('abcdef', 3)).toBe('abc…')
    expect(shortText('ab', 3)).toBe('ab')
    expect(shortText('', 3)).toBe('')
  })
})

describe('relativeTime', () => {
  const now = 1_000_000_000_000
  it('방금/분/시간/일', () => {
    expect(relativeTime(now, now)).toBe('방금')
    expect(relativeTime(now - 5 * 60000, now)).toBe('5분 전')
    expect(relativeTime(now - 3 * 3600_000, now)).toBe('3시간 전')
    expect(relativeTime(now - 2 * 86400_000, now)).toBe('2일 전')
    expect(relativeTime(0, now)).toBe('')
  })
})

describe('shortRef / debugRef', () => {
  it('id 앞 6자(하이픈 제거)', () => {
    expect(shortRef('aac8eda0-a623-49')).toBe('aac8ed')
  })
  it('debugRef는 permalink 없으면 생략', () => {
    const s = debugRef({ id: 'abc-123', channel: 'C1', channelName: '#dev', threadTs: '1', messageTs: '2' })
    expect(s).toContain('ref #abc123')
    expect(s).not.toContain('permalink')
  })
})

describe('matchesQuery', () => {
  const m = { channelName: '#dev', authorName: '홍길동', text: '배포 실패', analysis: { summary: '원인 미상' } }
  it('빈 쿼리는 항상 매치', () => expect(matchesQuery(m, '')).toBe(true))
  it('내용/작성자/요약 부분일치(소문자)', () => {
    expect(matchesQuery(m, '배포')).toBe(true)
    expect(matchesQuery(m, '홍길동')).toBe(true)
    expect(matchesQuery(m, '원인')).toBe(true)
    expect(matchesQuery(m, '없는말')).toBe(false)
  })
})

describe('hasOpenTodos', () => {
  it('미완료 todo 유무', () => {
    expect(hasOpenTodos({ todos: [{ done: true }, { done: false }] })).toBe(true)
    expect(hasOpenTodos({ todos: [{ done: true }] })).toBe(false)
    expect(hasOpenTodos({})).toBe(false)
  })
})

describe('fmtMsgTime', () => {
  it('빈/잘못된 ts는 빈 문자열', () => {
    expect(fmtMsgTime('')).toBe('')
    expect(fmtMsgTime('nope')).toBe('')
  })
  it('유효 ts는 시간 포함', () => {
    expect(fmtMsgTime(String(Date.now() / 1000))).toMatch(/\d/)
  })
})

describe('authorColor', () => {
  it('결정적(같은 이름=같은 색), 팔레트 내', () => {
    expect(authorColor('홍길동')).toBe(authorColor('홍길동'))
    expect(authorColor('a')).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('weekStart', () => {
  it('월요일 0시 반환', () => {
    const wed = new Date(2026, 6, 8, 15, 0, 0).getTime() // 2026-07-08 수요일
    const ws = new Date(weekStart(wed))
    expect(ws.getDay()).toBe(1) // 월
    expect(ws.getHours()).toBe(0)
  })
})

describe('lessonKeyLabel / 카테고리 상수', () => {
  it('키 라벨', () => {
    expect(lessonKeyLabel('analysis')).toBe('기본 분석')
    expect(lessonKeyLabel('dev')).toBe('개발 → PR')
    expect(lessonKeyLabel('custom')).toBe('custom')
  })
  it('CAT_ORDER의 모든 키가 CAT_LABEL에 있음', () => {
    for (const k of CAT_ORDER) expect(CAT_LABEL[k]).toBeTruthy()
  })
})
