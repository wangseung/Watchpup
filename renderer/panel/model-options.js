export const CLAUDE_MODEL_OPTIONS = Object.freeze([
  { value: 'opus', label: 'Opus (opus)' },
  { value: 'sonnet', label: 'Sonnet (sonnet)' },
  { value: 'fable', label: 'Fable (fable)' },
])

const MODEL_ALIASES = new Set(CLAUDE_MODEL_OPTIONS.map((option) => option.value))

export function normalizeClaudeModel(value) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return 'opus'
  const alias = trimmed.toLowerCase()
  return MODEL_ALIASES.has(alias) ? alias : trimmed
}

export function modelOptionsWithCurrent(value) {
  const selected = normalizeClaudeModel(value)
  const options = CLAUDE_MODEL_OPTIONS.map((option) => ({ ...option }))
  if (!MODEL_ALIASES.has(selected)) {
    options.push({ value: selected, label: `현재 저장값 (${selected})`, custom: true })
  }
  return { selected, options }
}
