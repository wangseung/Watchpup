import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { proposalResumeCommand, resolveWorkAgentRepo } from './work-agent.js'
import type { WatchpupConfig } from '../src/core/config/schema.js'
import type { WorkProposal } from '../src/core/workagent/types.js'

function gitRepo(root: string, name: string): string {
  const path = join(root, name)
  mkdirSync(join(path, '.git'), { recursive: true })
  return path
}

describe('resolveWorkAgentRepo', () => {
  it('태스크 지정 레포 → 기본 레포 순서만 보고, 자동 추론은 하지 않는다', () => {
    const root = mkdtempSync(join(tmpdir(), 'watchpup-repos-'))
    try {
      const zigzag = gitRepo(root, 'zigzag-ios-1')
      const preferred = gitRepo(root, 'preferred')
      const config = { repos: [zigzag], workAgentRepo: '' } as unknown as WatchpupConfig

      expect(resolveWorkAgentRepo(config, preferred)).toBe(preferred)
      expect(resolveWorkAgentRepo({ ...config, workAgentRepo: zigzag } as WatchpupConfig)).toBe(zigzag)
      // 레포 미지정이면 등록 레포가 있어도 null (자동 폴백 없음)
      expect(resolveWorkAgentRepo(config)).toBeNull()
      // 존재하지 않는 경로는 무시
      expect(resolveWorkAgentRepo(config, join(root, 'ghost'))).toBeNull()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('proposalResumeCommand', () => {
  it('provider·세션 유무에 맞는 명령을 만든다', () => {
    const base = { reminderId: 'r', status: 'ready', source: 'auto', branch: 'b', worktreePath: '/wt', repoPath: '/repo', startedAt: 1 } as WorkProposal
    expect(proposalResumeCommand({ ...base, provider: 'claude', sessionId: 'sid' })).toBe('claude --resume sid')
    expect(proposalResumeCommand({ ...base, provider: 'claude' })).toBe('claude --continue')
    expect(proposalResumeCommand({ ...base, provider: 'codex', sessionId: 'sid' })).toBe('codex resume sid')
  })
})
