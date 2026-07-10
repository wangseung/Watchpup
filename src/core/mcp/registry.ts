/**
 * MCP 레지스트리: 설정 → claude `--mcp-config` JSON 생성 + 시크릿 env 해석.
 * 하나의 책임: MCP 서버 배선.
 *
 * 리서치 반영:
 *  - R-3: 로컬 claude -p는 원격 MCP를 직접 배선(.mcp.json). ${VAR}는 child env에서 확장.
 *  - C-6: 미설정 ${VAR}는 전체 config 파싱 실패 → 필수 시크릿 사전 검증.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { WatchpupConfig } from '../config/schema.js'
import type { Keychain } from '../secrets/keychain.js'

type McpServerDef = WatchpupConfig['mcpServers'][number]

/** claude .mcp.json의 서버 엔트리 형태 */
type McpConfigEntry =
  | { command: string; args?: string[]; env?: Record<string, string> }
  | { type: 'http' | 'sse'; url: string; headers?: Record<string, string> }

function toEntry(s: McpServerDef): McpConfigEntry | null {
  // inherited: 이미 claude에 연결된 서버를 재정의하지 않고 허용리스트에만 추가
  if (s.transport === 'inherited') return null
  if (s.transport === 'stdio') {
    if (!s.command) return null
    const env: Record<string, string> = { ...(s.env ?? {}) }
    // secretEnv: ENV_NAME → ${ENV_NAME} (child env에서 확장됨)
    for (const envName of Object.keys(s.secretEnv ?? {})) env[envName] = `\${${envName}}`
    return { command: s.command, args: s.args, ...(Object.keys(env).length ? { env } : {}) }
  }
  if (!s.url) return null
  return {
    type: s.transport,
    url: s.url,
    ...(s.headers ? { headers: s.headers } : {}),
  }
}

/** 활성 서버로 --mcp-config 객체 생성 */
export function buildMcpConfig(config: WatchpupConfig): { mcpServers: Record<string, McpConfigEntry> } {
  const mcpServers: Record<string, McpConfigEntry> = {}
  for (const s of config.mcpServers) {
    if (!s.enabled) continue
    const entry = toEntry(s)
    if (entry) mcpServers[s.id] = entry
  }
  return { mcpServers }
}

/** --mcp-config 파일로 기록하고 경로 반환 (활성 서버 없으면 null) */
export function writeMcpConfigFile(config: WatchpupConfig, path: string): string | null {
  const cfg = buildMcpConfig(config)
  if (Object.keys(cfg.mcpServers).length === 0) return null
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(cfg, null, 2), 'utf8')
  return path
}

/** 활성 서버들이 요구하는 (envName → keychainKey) 매핑 */
export function requiredSecretEnv(config: WatchpupConfig): Record<string, string> {
  const map: Record<string, string> = {}
  for (const s of config.mcpServers) {
    if (!s.enabled || !s.secretEnv) continue
    for (const [envName, keychainKey] of Object.entries(s.secretEnv)) map[envName] = keychainKey
  }
  return map
}

/** child 프로세스에 주입할 시크릿 env 해석 (Keychain 조회). 누락 시 목록 반환. */
export async function resolveMcpSecretEnv(
  config: WatchpupConfig,
  keychain: Keychain,
): Promise<{ env: Record<string, string>; missing: string[] }> {
  const required = requiredSecretEnv(config)
  const env: Record<string, string> = {}
  const missing: string[] = []
  for (const [envName, keychainKey] of Object.entries(required)) {
    const v = await keychain.get(keychainKey)
    if (v == null) missing.push(`${envName} (keychain: ${keychainKey})`)
    else env[envName] = v
  }
  return { env, missing }
}
