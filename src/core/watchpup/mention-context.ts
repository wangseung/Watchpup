/**
 * 사용자 명령(액션/개발/자가평가)에 넘길 멘션 맥락 문자열 빌더 (순수).
 * gateway가 이벤트·부수효과를 담당하고, "무엇을 맥락으로 줄지"는 여기서 결정한다.
 */
import type { Mention } from '../types.js'

/** 스레드 대화를 한 줄씩 "작성자: 내용"으로. 없으면 트리거 원문. */
export function threadText(m: Mention): string {
  return (m.thread ?? []).map((x) => `${x.author}: ${x.text.replace(/\s+/g, ' ').trim()}`).join('\n') || m.text
}

/** playbook 실행용 맥락 — 채널·요청자·요약·원문. */
export function actionContext(m: Mention): string {
  const a = m.analysis
  return [
    `채널: ${m.channelName ?? m.channel}`,
    `요청자: ${m.authorName ?? m.authorId}`,
    a?.summary ? `요약: ${a.summary}` : '',
    `원문: ${m.text}`,
  ].filter(Boolean).join('\n')
}

/** 개발→PR용 맥락 — actionContext + 스레드 전문(코드 수정 판단에 필요). */
export function devContext(m: Mention): string {
  const a = m.analysis
  return [
    `채널: ${m.channelName ?? m.channel}`,
    `요청자: ${m.authorName ?? m.authorId}`,
    a?.summary ? `요약: ${a.summary}` : '',
    `원문: ${m.text}`,
    m.thread && m.thread.length ? '스레드:\n' + m.thread.map((x) => `${x.author}: ${x.text}`).join('\n') : '',
  ].filter(Boolean).join('\n')
}

/** 개발 브랜치/PR 제목 — headline > 요약 첫 줄 > 기본, ≤72자. */
export function devTitle(m: Mention): string {
  const a = m.analysis
  return (a?.headline || a?.summary?.split('\n')[0] || '자동 수정').slice(0, 72)
}
