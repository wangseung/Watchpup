/**
 * claude -p 구조화 출력 파서 (순수 함수). 하나의 책임: 텍스트 → MentionAnalysis(관대한 폴백).
 */
import type { MentionAnalysis, MentionCategory, SuggestedAction, TodoSpec } from '../types.js'
import { MENTION_CATEGORIES } from '../types.js'

function parseCategory(raw: unknown): MentionCategory | undefined {
  return typeof raw === 'string' && (MENTION_CATEGORIES as string[]).includes(raw)
    ? (raw as MentionCategory)
    : undefined
}

function parseActions(raw: unknown): SuggestedAction[] {
  if (!Array.isArray(raw)) return []
  const out: SuggestedAction[] = []
  for (const a of raw) {
    if (a && typeof a === 'object') {
      const label = (a as { label?: unknown }).label
      const playbookId = (a as { playbookId?: unknown }).playbookId
      if (typeof label === 'string' && typeof playbookId === 'string' && label && playbookId) {
        out.push({ label, playbookId })
      }
    }
  }
  return out
}

// todos: 문자열 또는 {text, playbookId?} 둘 다 허용
function parseTodos(raw: unknown): TodoSpec[] {
  if (!Array.isArray(raw)) return []
  const out: TodoSpec[] = []
  for (const t of raw) {
    if (typeof t === 'string' && t.trim()) {
      out.push({ text: t })
    } else if (t && typeof t === 'object') {
      const text = (t as { text?: unknown }).text
      const playbookId = (t as { playbookId?: unknown }).playbookId
      if (typeof text === 'string' && text.trim()) {
        out.push({ text, playbookId: typeof playbookId === 'string' && playbookId ? playbookId : undefined })
      }
    }
  }
  return out
}

export function parseAnalysis(text: string): MentionAnalysis {
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('no json')
    const obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
    return {
      headline: typeof obj.headline === 'string' ? obj.headline : '',
      summary: typeof obj.summary === 'string' ? obj.summary : '',
      advice: typeof obj.advice === 'string' ? obj.advice : '',
      todos: parseTodos(obj.todos),
      draftReply: typeof obj.draftReply === 'string' ? obj.draftReply : '',
      actions: parseActions(obj.actions),
      category: parseCategory(obj.category),
    }
  } catch {
    return { headline: '분석 실패', summary: '분석 결과 파싱 실패', advice: text.slice(0, 2000), todos: [], draftReply: '', actions: [] }
  }
}
