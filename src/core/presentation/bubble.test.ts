import { describe, it, expect } from 'vitest'
import { bubbleReady, bubbleFollowup, bubbleAnalyzing } from './bubble.js'
import type { Mention } from '../types.js'

function mention(over: Partial<Mention> = {}): Mention {
  return {
    id: 'x', channel: 'C1', channelName: '#dev', threadTs: '1', messageTs: '1',
    authorId: 'U1', text: '배포 파이프라인 에러 재현됩니다', mentionedAt: 0,
    status: 'ready', todos: [],
    analysis: { headline: '답장 필요', summary: '배포 실패 원인 공유. 확인 요청.', advice: '', todos: [], draftReply: '', actions: [] },
    ...over,
  }
}

describe('bubble presentation', () => {
  it('status: 행동 우선 + 주제 + 클릭 유도(2줄)', () => {
    const s = bubbleReady(mention(), 'status')
    expect(s.startsWith('💡 답장 필요')).toBe(true)
    expect(s).toContain('눌러서 열기')
    expect(s.split('\n').length).toBe(2)
  })
  it('summary: 헤드라인 + 요약 한 줄', () => {
    const s = bubbleReady(mention(), 'summary')
    expect(s).toContain('답장 필요')
    expect(s).not.toContain('눌러서 열기')
  })
  it('witty: 이모지 유도', () => {
    expect(bubbleReady(mention(), 'witty')).toContain('볼까요?')
  })
  it('headline 없으면 요약 첫 구절/폴백', () => {
    const s = bubbleReady(mention({ analysis: { headline: '', summary: '배포 실패 원인 공유', advice: '', todos: [], draftReply: '', actions: [] } }), 'status')
    expect(s).toContain('배포 실패 원인 공유')
  })
  it('followup: 💬 + 주제', () => {
    expect(bubbleFollowup(mention(), 'status')).toMatch(/^💬/)
    expect(bubbleFollowup(mention(), 'summary')).not.toContain('눌러서 열기')
  })
  it('analyzing: 주제에 대해 분석 중 / summary는 짧게', () => {
    expect(bubbleAnalyzing(mention(), 'status')).toContain('분석 중')
    expect(bubbleAnalyzing(mention(), 'summary')).toBe('🔍 분석 중…')
  })
  it('긴 headline은 24자 컷', () => {
    const long = '가'.repeat(40)
    const s = bubbleReady(mention({ analysis: { headline: long, summary: '', advice: '', todos: [], draftReply: '', actions: [] } }), 'summary')
    expect(s.replace('💡 ', '').length).toBeLessThanOrEqual(24)
  })
})
