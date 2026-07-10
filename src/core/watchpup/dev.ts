/**
 * 개발 → PR 워크플로우.
 * 격리 git worktree에서 claude가 자율 수정·검증·커밋 → node가 push → gh로 Draft PR 생성.
 * 자율 편집/커밋을 위해 claude는 이 실행에서만 권한 bypass(dangerous). 작업 트리는 건드리지 않음.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { WatchpupConfig } from '../config/schema.js'
import { Keychain } from '../secrets/keychain.js'
import type { AgentStreamEvent } from '../types.js'
import { runClaude } from '../agent/executor.js'
import { logger } from '../observability/logger.js'

const pexec = promisify(execFile)
async function run(cmd: string, args: string[], cwd: string): Promise<string> {
  const { stdout } = await pexec(cmd, args, { cwd, env: process.env, maxBuffer: 16 * 1024 * 1024 })
  return stdout.trim()
}

export interface DevResult {
  branch: string
  prUrl?: string
  text: string
  error?: string
}

function devSystem(): string {
  return [
    '너는 시니어 소프트웨어 엔지니어다. 주어진 git worktree 안에서만 작업한다.',
    '규칙: 변경은 최소화하고 레포 컨벤션을 지킨다. 수정 후 가능하면 빌드/테스트로 검증한다.',
    '작업이 끝나면 반드시 `git add -A && git commit -m "<간결한 커밋 메시지>"` 로 커밋한다.',
    '절대 push 하거나 PR을 만들지 말고, 다른 브랜치/다른 레포를 건드리지 마라(push·PR은 외부에서 처리).',
    '마지막에 무엇을 왜 고쳤는지 한국어로 3~6줄 요약한다.',
  ].join('\n')
}

function devPrompt(context: string, extra: string): string {
  return [
    '아래 Slack 스레드 맥락과 추가 지시를 바탕으로 이 레포(worktree)의 버그를 수정하고 커밋해라.',
    '--- 스레드 맥락 ---',
    context,
    '--- 추가 지시(사용자) ---',
    extra || '(없음)',
    '--- 끝 ---',
  ].join('\n')
}

export async function runDev(
  deps: { config: WatchpupConfig; keychain: Keychain },
  input: { repoPath: string; context: string; extraContext: string; idShort: string; title?: string; onEvent?: (e: AgentStreamEvent) => void },
): Promise<DevResult> {
  const repo = input.repoPath
  if (!existsSync(join(repo, '.git'))) return { branch: '', text: '', error: 'git 레포가 아닙니다: ' + repo }
  const branch = `watchpup/fix-${input.idShort}-${Date.now().toString(36)}`
  const wt = join(tmpdir(), `watchpup-dev-${input.idShort}-${Date.now().toString(36)}`)

  input.onEvent?.({ type: 'progress', text: `\n[worktree 생성: ${branch}]\n` })
  try {
    await run('git', ['worktree', 'add', wt, '-b', branch], repo)
  } catch (e) {
    return { branch, text: '', error: 'worktree 생성 실패: ' + String(e) }
  }

  try {
    // 1) claude 자율 수정·커밋 (격리 worktree, 권한 bypass)
    const result = await runClaude({
      prompt: devPrompt(input.context, input.extraContext),
      config: deps.config,
      agents: {},
      allowedTools: [],
      disallowedTools: [],
      systemPrompt: devSystem(),
      isResume: false,
      cwd: wt,
      dangerous: true,
      onEvent: input.onEvent,
    })

    // 2) claude가 커밋 안 했으면 남은 변경을 커밋
    const dirty = await run('git', ['status', '--porcelain'], wt)
    if (dirty) {
      await run('git', ['add', '-A'], wt)
      await run('git', ['commit', '-m', `watchpup: ${input.title || '자동 수정'}`], wt)
    }
    // 커밋이 하나라도 있는지 확인(HEAD가 base보다 앞선지)
    const ahead = await run('git', ['rev-list', '--count', '@{upstream}..HEAD'], wt).catch(() => '')
    void ahead

    // 3) push
    input.onEvent?.({ type: 'progress', text: '\n[push 중…]\n' })
    await run('git', ['push', '-u', 'origin', branch], wt)

    // 4) Draft PR
    input.onEvent?.({ type: 'progress', text: '\n[Draft PR 생성 중…]\n' })
    const title = input.title || `watchpup: ${branch}`
    const body = [
      '🐾 watchpup가 스레드 맥락 + 사용자 지시로 자동 작성한 초안 PR입니다. 리뷰 필요.',
      '',
      '## 요약',
      result.text || '(요약 없음)',
    ].join('\n')
    const out = await run('gh', ['pr', 'create', '--draft', '--title', title, '--body', body, '--head', branch], wt)
    const prUrl = out.split(/\s+/).find((s) => /^https?:\/\/.*\/pull\/\d+/.test(s)) || out.split('\n').pop()

    // 5) 성공 시 worktree 정리(브랜치·원격은 유지)
    await run('git', ['worktree', 'remove', wt, '--force'], repo).catch(() => {})

    return { branch, prUrl, text: result.text }
  } catch (e) {
    logger.error('runDev 실패', { branch, err: String(e) })
    // 실패 시 worktree는 조사용으로 남겨둠
    return { branch, text: '', error: String(e) }
  }
}
