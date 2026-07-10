/**
 * 수집·필터 레이어(순수). 감지된 RawMention을 실제 분석에 넘길지 결정한다.
 *  - dedup: 이미 본 메시지 제외
 *  - 나이 컷오프: 오래된 메시지(그룹 언급 등으로 뒤늦게 딸려온 과거 스레드) 제외.
 *    단 이미 추적 중인 스레드의 새 활동은 통과.
 * 흐름상 [감지] → **[수집·필터]** → [보강/분석].
 */
export type IngestSkipReason = 'dedup' | 'too-old'

export interface IngestDecision {
  ingest: boolean
  /** ingest=false일 때의 사유 */
  reason?: IngestSkipReason
  /** 나이 컷오프로 걸러도 dedup은 찍어야 재폴링에서 또 안 걸린다 */
  markSeen: boolean
}

export function decideIngest(input: {
  messageTs: string
  nowMs: number
  maxAgeDays: number
  alreadySeen: boolean
  alreadyTracked: boolean
}): IngestDecision {
  if (input.alreadySeen) return { ingest: false, reason: 'dedup', markSeen: false }
  if (input.maxAgeDays > 0 && !input.alreadyTracked) {
    const ageMs = input.nowMs - parseFloat(input.messageTs) * 1000
    if (ageMs > input.maxAgeDays * 86_400_000) {
      return { ingest: false, reason: 'too-old', markSeen: true }
    }
  }
  return { ingest: true, markSeen: true }
}
