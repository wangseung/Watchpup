import { describe, it, expect } from 'vitest'
import { threadText, actionContext, devContext, devTitle } from './mention-context.js'
import type { Mention } from '../types.js'

function m(over: Partial<Mention> = {}): Mention {
  return {
    id: 'x', channel: 'C1', channelName: '#dev', threadTs: '1', messageTs: '1',
    authorId: 'U1', authorName: '홍길동', text: '배포 에러 나요', mentionedAt: 0,
    status: 'ready', todos: [],
    analysis: { headline: '원인 조사', summary: '배포 실패', advice: '', todos: [], draftReply: '', actions: [] },
    thread: [{ author: '김', text: '로그   확인\n필요', mine: false }, { author: '나', text: '넵', mine: true }],
    ...over,
  }
}

describe('threadText', () => {
  it('작성자: 내용, 공백 정규화', () => {
    expect(threadText(m())).toBe('김: 로그 확인 필요\n나: 넵')
  })
  it('스레드 없으면 원문', () => {
    expect(threadText(m({ thread: [] }))).toBe('배포 에러 나요')
  })
})

describe('actionContext', () => {
  it('채널·요청자·요약·원문 포함, 스레드 미포함', () => {
    const c = actionContext(m())
    expect(c).toContain('채널: #dev')
    expect(c).toContain('요청자: 홍길동')
    expect(c).toContain('요약: 배포 실패')
    expect(c).toContain('원문: 배포 에러 나요')
    expect(c).not.toContain('스레드:')
  })
  it('요약 없으면 요약 줄 생략', () => {
    const c = actionContext(m({ analysis: undefined }))
    expect(c).not.toContain('요약:')
  })
})

describe('devContext', () => {
  it('스레드 전문 포함', () => {
    expect(devContext(m())).toContain('스레드:')
  })
})

describe('devTitle', () => {
  it('headline 우선', () => expect(devTitle(m())).toBe('원인 조사'))
  it('headline 없으면 요약 첫 줄', () => {
    expect(devTitle(m({ analysis: { headline: '', summary: '첫줄\n둘째줄', advice: '', todos: [], draftReply: '', actions: [] } }))).toBe('첫줄')
  })
  it('둘 다 없으면 기본, 72자 컷', () => {
    expect(devTitle(m({ analysis: undefined }))).toBe('자동 수정')
    const long = devTitle(m({ analysis: { headline: 'x'.repeat(100), summary: '', advice: '', todos: [], draftReply: '', actions: [] } }))
    expect(long.length).toBe(72)
  })
})
