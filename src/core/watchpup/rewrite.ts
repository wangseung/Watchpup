/**
 * 답장 초안 원클릭 리라이트 — 의미는 유지하고 요청한 톤으로만 다시 쓴다.
 * 도구/MCP/세션 없이 가벼운 claude 호출(빠르고 저렴).
 */
import type { WatchpupConfig } from '../config/schema.js'
import { Keychain } from '../secrets/keychain.js'
import { runClaude } from '../agent/executor.js'

export const REWRITE_STYLES = {
  polite: '더 정중하고 격식 있는 존댓말로',
  short: '핵심만 더 짧고 간결하게',
  soft: '더 부드럽고 완곡하게',
  english: '자연스러운 영어로 번역해서',
} as const
export type RewriteStyle = keyof typeof REWRITE_STYLES

export async function rewriteReply(
  deps: { config: WatchpupConfig; keychain: Keychain },
  current: string,
  style: RewriteStyle,
): Promise<string> {
  const instruction = REWRITE_STYLES[style] ?? '자연스럽게'
  const result = await runClaude({
    prompt: `아래 Slack 답장을 ${instruction} 다시 써줘. 의미는 유지하고, 답장 본문만 출력(설명·따옴표·머리말 없이).\n\n---\n${current}\n---`,
    config: deps.config,
    agents: {},
    allowedTools: [],
    disallowedTools: [],
    systemPrompt: '너는 사용자의 Slack 답장 문구를 다듬는 도우미다. 요청한 스타일로만 다시 쓰고 다른 설명은 하지 않는다.',
    isResume: false,
    permissionMode: 'default',
  })
  return (result.text || '').trim()
}
