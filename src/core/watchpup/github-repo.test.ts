import { describe, it, expect } from 'vitest'
import { parseRepoSpec } from './github-repo.js'

describe('parseRepoSpec', () => {
  it('owner/repo 형태', () => {
    expect(parseRepoSpec('anthropics/claude-code')).toEqual({ owner: 'anthropics', repo: 'claude-code', slug: 'anthropics-claude-code' })
  })
  it('https URL (.git·트레일링 슬래시 허용)', () => {
    expect(parseRepoSpec('https://github.com/owner/repo.git')).toMatchObject({ owner: 'owner', repo: 'repo' })
    expect(parseRepoSpec('https://github.com/owner/repo/')).toMatchObject({ owner: 'owner', repo: 'repo' })
  })
  it('git@ SSH 형태', () => {
    expect(parseRepoSpec('git@github.com:owner/repo.git')).toMatchObject({ owner: 'owner', repo: 'repo' })
  })
  it('잘못된 입력은 null', () => {
    expect(parseRepoSpec('그냥 텍스트')).toBeNull()
    expect(parseRepoSpec('')).toBeNull()
    expect(parseRepoSpec('onlyname')).toBeNull()
  })
})
