/**
 * 사용자 글로벌 Claude Code MCP 설정(~/.claude.json)을 읽어 watchpup McpServer 형식으로 변환.
 * "가져오기"용 후보 제공 — 실제 등록은 사용자가 선택한 것만.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { homedir } from 'node:os'

interface RawEntry {
  type?: string
  command?: string
  args?: string[]
  url?: string
  headers?: Record<string, string>
  env?: Record<string, string>
}

export interface McpCandidate {
  id: string
  label: string
  enabled: boolean
  transport: 'stdio' | 'http' | 'sse'
  command?: string
  args?: string[]
  url?: string
  headers?: Record<string, string>
  env?: Record<string, string>
  writeTools: string[]
  source: string // 'global' | 'project:<name>'
}

function toCandidate(id: string, e: RawEntry, source: string): McpCandidate | null {
  const transport = (e.type === 'http' || e.type === 'sse' ? e.type : e.url && !e.command ? 'http' : 'stdio') as
    | 'stdio' | 'http' | 'sse'
  if (transport === 'stdio' && !e.command) return null
  if (transport !== 'stdio' && !e.url) return null
  const c: McpCandidate = { id, label: '', enabled: true, transport, writeTools: [], source }
  if (transport === 'stdio') {
    c.command = e.command
    c.args = Array.isArray(e.args) ? e.args : []
    if (e.env && Object.keys(e.env).length) c.env = e.env
  } else {
    c.url = e.url
    if (e.headers && Object.keys(e.headers).length) c.headers = e.headers
  }
  return c
}

/** 활성화된 플러그인 이름 집합 (settings.json enabledPlugins: "name@marketplace": true) */
function enabledPluginNames(): Set<string> {
  const out = new Set<string>()
  try {
    const j = JSON.parse(readFileSync(join(homedir(), '.claude', 'settings.json'), 'utf8')) as { enabledPlugins?: Record<string, boolean> }
    for (const [k, v] of Object.entries(j.enabledPlugins ?? {})) if (v) out.add(k.split('@')[0])
  } catch {
    /* 없으면 빈 집합 */
  }
  return out
}

/** ~/.claude/plugins/marketplaces 아래 .mcp.json 파일 경로를 얕게 수집(깊이 제한) */
function findPluginMcpFiles(base: string, depth = 0, acc: string[] = []): string[] {
  if (depth > 5) return acc
  let entries: string[] = []
  try {
    entries = readdirSync(base)
  } catch {
    return acc
  }
  for (const name of entries) {
    const p = join(base, name)
    try {
      if (name === '.mcp.json') acc.push(p)
      else if (statSync(p).isDirectory() && name !== 'node_modules') findPluginMcpFiles(p, depth + 1, acc)
    } catch {
      /* skip */
    }
  }
  return acc
}

/** 활성 플러그인이 제공하는 MCP 서버를 후보로 수집(플러그인 폴더명이 enabled 목록에 있는 것만) */
function readPluginMcpCandidates(seen: Set<string>): McpCandidate[] {
  const enabled = enabledPluginNames()
  if (!enabled.size) return []
  const marketBase = join(homedir(), '.claude', 'plugins', 'marketplaces')
  const out: McpCandidate[] = []
  for (const file of findPluginMcpFiles(marketBase)) {
    // .mcp.json의 상위 폴더명 = 플러그인 이름
    const pluginName = basename(dirname(file))
    if (!enabled.has(pluginName)) continue
    let raw: Record<string, unknown>
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      continue
    }
    // 두 형식 지원: { "<id>": {...} }  또는  { "mcpServers": { "<id>": {...} } }
    const json = (raw.mcpServers && typeof raw.mcpServers === 'object' ? raw.mcpServers : raw) as Record<string, RawEntry>
    for (const [id, e] of Object.entries(json)) {
      if (seen.has(id) || !e || typeof e !== 'object') continue
      const c = toCandidate(id, e, `plugin:${pluginName}`)
      if (c) { seen.add(id); out.push(c) }
    }
  }
  return out
}

/** 글로벌 + 프로젝트별 + 활성 플러그인 mcpServers를 후보로 수집(같은 id는 앞선 것 우선). */
export function readGlobalMcpCandidates(): McpCandidate[] {
  const out: McpCandidate[] = []
  const seen = new Set<string>()
  const p = join(homedir(), '.claude.json')
  if (existsSync(p)) {
    let json: { mcpServers?: Record<string, RawEntry>; projects?: Record<string, { mcpServers?: Record<string, RawEntry> }> } = {}
    try {
      json = JSON.parse(readFileSync(p, 'utf8'))
    } catch {
      /* ignore */
    }
    for (const [id, e] of Object.entries(json.mcpServers ?? {})) {
      const c = toCandidate(id, e, 'global')
      if (c && !seen.has(id)) { seen.add(id); out.push(c) }
    }
    for (const [projPath, pv] of Object.entries(json.projects ?? {})) {
      const name = projPath.split('/').filter(Boolean).pop() || projPath
      for (const [id, e] of Object.entries(pv.mcpServers ?? {})) {
        if (seen.has(id)) continue
        const c = toCandidate(id, e, `project:${name}`)
        if (c) { seen.add(id); out.push(c) }
      }
    }
  }
  // 활성 플러그인 MCP 서버
  out.push(...readPluginMcpCandidates(seen))
  return out
}
