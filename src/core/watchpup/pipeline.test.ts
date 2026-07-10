import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { analyzeMention, sourcesFromTools } from './pipeline.js'
import { parseConfig } from '../config/schema.js'
import { SessionStore } from '../session/store.js'
import { Keychain } from '../secrets/keychain.js'
import type { AgentResult } from '../types.js'

function deps() {
  const dir = mkdtempSync(join(tmpdir(), 'watchpup-pl-'))
  const config = parseConfig({ workDir: dir, dataDir: dir })
  return {
    config,
    sessions: new SessionStore(join(dir, 'sessions.json'), 128, 3_600_000),
    keychain: new Keychain('watchpup-test'),
    runClaudeFn: async (): Promise<AgentResult> => ({
      text: '{"summary":"요약","advice":"조언","todos":["A","B"],"draftReply":"답장"}',
      sessionId: 'sid-1', isError: false, toolsUsed: [],
    }),
  }
}

describe('analyzeMention', () => {
  it('produces a ready Mention with parsed analysis and todos', async () => {
    const m = await analyzeMention(deps(), {
      id: 'abcdef12', channel: 'C1', threadTs: '100.1', messageTs: '100.1',
      authorId: 'U9', text: '이거 봐줘', threadText: '스레드 전문', mentionedAt: 1720339200000,
    })
    expect(m.status).toBe('ready')
    expect(m.analysis?.summary).toBe('요약')
    expect(m.todos).toEqual([{ text: 'A', done: false }, { text: 'B', done: false }])
    expect(m.sessionId).toBe('sid-1')
  })
})

describe('sourcesFromTools', () => {
  it('도구 이름을 소스 라벨로 매핑(중복 제거)', () => {
    const s = sourcesFromTools(['mcp__notion__query', 'Grep', 'Read', 'WebSearch', 'mcp__notion__fetch'], true)
    expect(s).toEqual(['노션', '코드', '웹'])
  })
  it('레포 없으면 파일도구는 노트로', () => {
    expect(sourcesFromTools(['Read'], false)).toEqual(['노트'])
  })
  it('기타 mcp 서버는 서버명으로', () => {
    expect(sourcesFromTools(['mcp__jira__search'], true)).toEqual(['jira'])
  })
  it('빈 입력 → 빈 배열', () => {
    expect(sourcesFromTools([], true)).toEqual([])
  })
})
