/**
 * GitHub 레포를 관리 캐시로 클론(또는 이미 있으면 pull) → 로컬 경로 반환.
 * 클론된 레포는 로컬 레포처럼 코드 원인 조사(grep/read)·개발→PR(worktree·push·gh)에 쓰인다.
 * gh CLI 인증을 사용(개발→PR에서도 이미 gh 의존).
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseRepoSpec } from '../src/core/watchpup/github-repo.js'

const pexec = promisify(execFile)

export async function addGithubRepo(spec: string, reposDir: string): Promise<{ path: string; action: 'cloned' | 'updated' }> {
  const p = parseRepoSpec(spec)
  if (!p) throw new Error('레포 형식이 올바르지 않습니다 (owner/repo 또는 GitHub URL)')
  mkdirSync(reposDir, { recursive: true })
  const dest = join(reposDir, p.slug)
  const opts = { env: process.env, maxBuffer: 16 * 1024 * 1024 } as const
  if (existsSync(join(dest, '.git'))) {
    await pexec('git', ['-C', dest, 'pull', '--ff-only'], opts)
    return { path: dest, action: 'updated' }
  }
  await pexec('gh', ['repo', 'clone', `${p.owner}/${p.repo}`, dest], opts)
  return { path: dest, action: 'cloned' }
}
