/**
 * 출력 안전 필터 (순수 함수). 하나의 책임: 시크릿 마스킹 + 길이 제한.
 */

/** 마스킹 패턴 — 알려진 토큰 형태 */
const PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/g, label: 'slack-token' },
  { re: /xapp-[A-Za-z0-9-]{10,}/g, label: 'slack-app-token' },
  { re: /sk-ant-[A-Za-z0-9-]{10,}/g, label: 'anthropic-key' },
  { re: /ghp_[A-Za-z0-9]{20,}/g, label: 'github-pat' },
  { re: /gho_[A-Za-z0-9]{20,}/g, label: 'github-oauth' },
  { re: /AKIA[0-9A-Z]{16}/g, label: 'aws-akid' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, label: 'private-key' },
  { re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, label: 'jwt' },
  { re: /\b[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b(?=.*(?:password|secret|token))/gi, label: 'cred' },
]

export function redactSecrets(text: string): string {
  let out = text
  for (const { re, label } of PATTERNS) {
    out = out.replace(re, `«${label}:redacted»`)
  }
  return out
}

/**
 * Slack 메시지 길이 제한. 초과 시 잘라내고 안내.
 * @returns 잘린 텍스트 + 넘침 여부
 */
export function clampLength(text: string, max = 3800): { text: string; overflow: boolean } {
  if (text.length <= max) return { text, overflow: false }
  return { text: text.slice(0, max - 40) + '\n\n…(길이 제한으로 잘림)', overflow: true }
}

/** 안전 처리 파이프라인: 마스킹 → 길이 제한 */
export function sanitizeOutput(text: string, max = 3800): { text: string; overflow: boolean } {
  return clampLength(redactSecrets(text), max)
}
