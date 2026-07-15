import type { WorkItem } from '../work/types.js'

const MIN_INTERVAL_MINUTES = 1
const MAX_INTERVAL_MINUTES = 120
const RECENT_WORK_MS = 14 * 24 * 60 * 60 * 1000

const TASK_LINES: ReadonlyArray<(title: string) => string> = [
  (title) => `“${title}” 아직 머릿속에 있죠?`,
  (title) => `잠깐! “${title}” 어디까지 했더라?`,
  (title) => `“${title}” 다시 이어갈 타이밍 아닌가요?`,
  (title) => `병렬 작업 체크! “${title}”도 아직 살아 있어요.`,
  (title) => `혹시 “${title}” 잊은 건 아니죠? 👀`,
]

export const GENERIC_NAGGING_LINES: readonly string[] = [
  '지금 벌여둔 작업 중 하나 잊은 건 없어요?',
  '하던 일 체크! 잠깐 멈춘 작업도 기억하고 있죠?',
  '작업 스택 한번 훑어볼까요? 👀',
  '새 일 전에 멈춰둔 일 하나만 떠올려봐요.',
]

function safeMinutes(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(MIN_INTERVAL_MINUTES, Math.min(MAX_INTERVAL_MINUTES, Math.round(value)))
}

export function nextNaggingDelayMs(
  minMinutes: number,
  maxMinutes: number,
  rand: () => number = Math.random,
): number {
  const min = safeMinutes(minMinutes, 5)
  const max = Math.max(min, safeMinutes(maxMinutes, 12))
  const ratio = Math.max(0, Math.min(0.999999, rand()))
  return Math.round((min + (max - min) * ratio) * 60_000)
}

export function pickNaggingWorkItem(
  items: WorkItem[],
  touchedAt: Record<string, number>,
  lastTaskId = '',
  now = Date.now(),
  rand: () => number = Math.random,
): WorkItem | null {
  const open = items.filter((item) => !item.completed && !item.parentId)
  if (!open.length) return null

  const recentlyTouched = open.filter((item) => {
    const touched = touchedAt[item.id]
    return Number.isFinite(touched) && now - touched <= RECENT_WORK_MS
  })
  const preferred = recentlyTouched.length >= 2 ? recentlyTouched : open
  const withoutLast = preferred.length > 1 ? preferred.filter((item) => item.id !== lastTaskId) : preferred
  const pool = withoutLast.length ? withoutLast : preferred
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, rand()) * pool.length))
  return pool[index] ?? null
}

export function naggingLine(item: WorkItem | null, rand: () => number = Math.random): string {
  if (!item) {
    const index = Math.min(GENERIC_NAGGING_LINES.length - 1, Math.floor(Math.max(0, rand()) * GENERIC_NAGGING_LINES.length))
    return GENERIC_NAGGING_LINES[index]
  }
  const index = Math.min(TASK_LINES.length - 1, Math.floor(Math.max(0, rand()) * TASK_LINES.length))
  return TASK_LINES[index](item.title || '하던 작업')
}
