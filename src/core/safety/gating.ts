/**
 * 쓰기 게이팅 + 툴 스코프 계산 (순수 함수).
 * 하나의 책임: 요청 컨텍스트 → 허용/금지 툴 목록.
 *
 * 리서치 반영:
 *  - R-4: default-deny 보증은 서버별 full-tool-name write 목록으로. verb prefix 미신뢰.
 *  - R-1: disallowedTools가 먼저 적용됨 → `mcp__<id>` 전체허용 + write 툴만 deny = 읽기전용.
 *  - R-2: parent는 default 모드; 하드 제약은 disallowedTools로 강제.
 *
 * (Watchpup는 개인용 단일 사용자이므로 team allowlist 판정(isWriteAllowed/isInternalAllowed)은 없음)
 */
import type { WatchpupConfig } from '../config/schema.js'

/** 서브에이전트 위임 + 로컬 읽기용 코어 툴 */
export const CORE_READ_TOOLS = ['Task', 'Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch', 'TodoWrite']

/** mcp 전체 서버 허용 토큰 */
function serverWildcard(id: string): string {
  return `mcp__${id}`
}

/** write 툴의 full name 목록 */
export function writeToolFullNames(config: WatchpupConfig): string[] {
  const out: string[] = []
  for (const s of config.mcpServers) {
    if (!s.enabled) continue
    for (const t of s.writeTools ?? []) out.push(`mcp__${s.id}__${t}`)
  }
  return out
}

export interface ToolScope {
  allowedTools: string[]
  disallowedTools: string[]
}

/**
 * 툴 스코프 계산.
 * @param write true면 쓰기 툴 허용(승인된 액션 실행), false면 default-deny(읽기전용)
 */
export function computeToolScope(config: WatchpupConfig, write: boolean): ToolScope {
  const enabled = config.mcpServers.filter((s) => s.enabled)
  const allowedTools = [...CORE_READ_TOOLS, ...enabled.map((s) => serverWildcard(s.id))]
  const disallowedTools = write ? [] : writeToolFullNames(config)
  return { allowedTools, disallowedTools }
}

/** 비인가(외부) 유저용 공개 스코프 — 로컬 파일/내부 MCP 불가, 웹만 */
export const PUBLIC_TOOLS = ['WebSearch', 'WebFetch']

/** 비인가 유저용 툴 스코프 (내부 도구 전면 차단) */
export function publicToolScope(): ToolScope {
  return { allowedTools: [...PUBLIC_TOOLS], disallowedTools: [] }
}

/** 승인 리액션 이모지 */
export const APPROVE_EMOJI = 'white_check_mark'
export const REJECT_EMOJIS = ['x', 'no_entry', 'no_entry_sign']
