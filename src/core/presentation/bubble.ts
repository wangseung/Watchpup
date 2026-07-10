/**
 * 표현 레이어(도메인 이벤트 → 펫 말풍선 텍스트). 순수 함수 — Mention + 표시 방식만 받아 문자열 생성.
 * 흐름상 [도메인 이벤트]와 [표현] 사이의 포맷팅 단계. electron/main 이 style을 주입해 호출한다.
 */
import type { Mention } from '../types.js'

export type BubbleStyle = 'status' | 'summary' | 'witty'

function chLabel(m: Mention): string {
  return m.channelName || '스레드'
}

/** 스레드 "주제"를 아주 짧게 — 멘션 원문 스니펫, 없으면 채널명. */
function topicOf(m: Mention): string {
  const raw = (m.text ?? '').replace(/\s+/g, ' ').trim()
  const t = raw ? (raw.length > 16 ? raw.slice(0, 15) + '…' : raw) : ''
  return t || chLabel(m)
}

/** 헤드라인 한 조각(≤24). */
function shortHead(m: Mention, fallback: string): string {
  const a = m.analysis
  let h = (a?.headline ?? '').trim() || (a?.summary ?? '').split(/[.!?\n·]/)[0].trim() || fallback
  if (h.length > 24) h = h.slice(0, 23) + '…'
  return h
}

/** 요약 둘째 줄용 — 요약 첫 문장을 ≤34자로. */
function shortSummaryLine(m: Mention): string {
  const s = (m.analysis?.summary ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return ''
  const first = s.split(/(?<=[.!?。])\s/)[0] || s
  return first.length > 34 ? first.slice(0, 33) + '…' : first
}

/** 준비됨 — 1줄: 내가 해야 할 행동, 2줄: 주제 + "눌러서 열기" 유도. */
export function bubbleReady(m: Mention, style: BubbleStyle): string {
  const head = shortHead(m, '확인 필요')
  if (style === 'witty') return `💡 ${head} ✨\n“${topicOf(m)}” — 눌러서 볼까요?`
  if (style === 'summary') {
    const sub = shortSummaryLine(m)
    return sub ? `💡 ${head}\n${sub}` : `💡 ${head}`
  }
  return `💡 ${head}\n“${topicOf(m)}” — 눌러서 열기`
}

/** 후속 답글(나를 다시 안 부른 대화 진행). */
export function bubbleFollowup(m: Mention, style: BubbleStyle): string {
  const head = shortHead(m, '새 답글')
  if (style === 'summary') return head ? `💬 ${head}` : '💬 새 답글'
  return `💬 ${head}\n“${topicOf(m)}” — 눌러서 열기`
}

/** 분석 중 상태 라인 — "주제"에 대해 분석 중. */
export function bubbleAnalyzing(m: Mention, style: BubbleStyle): string {
  if (style === 'summary') return '🔍 분석 중…'
  if (style === 'witty') return `🔍 “${topicOf(m)}” 살펴보는 중… 👀`
  return `🔍 “${topicOf(m)}”에 대해 분석 중…`
}
