import { describe, it, expect } from 'vitest'
import { redactSecrets, clampLength, sanitizeOutput } from './redact.js'

describe('redactSecrets', () => {
  it('slack/anthropic/github 토큰 마스킹', () => {
    expect(redactSecrets('token xoxb-123456789012-abcdefghijkl')).toContain('«slack-token:redacted»')
    expect(redactSecrets('key sk-ant-api03-abcdefghijklmnop')).toContain('«anthropic-key:redacted»')
    expect(redactSecrets('pat ghp_abcdefghijklmnopqrstuvwxyz0123')).toContain('«github-pat:redacted»')
  })
  it('일반 텍스트는 유지', () => {
    expect(redactSecrets('안녕하세요 코드입니다')).toBe('안녕하세요 코드입니다')
  })
})

describe('clampLength', () => {
  it('짧으면 그대로', () => {
    expect(clampLength('짧음', 100)).toEqual({ text: '짧음', overflow: false })
  })
  it('길면 자르고 overflow', () => {
    const r = clampLength('a'.repeat(200), 50)
    expect(r.overflow).toBe(true)
    expect(r.text.length).toBeLessThanOrEqual(50)
  })
})

describe('sanitizeOutput', () => {
  it('마스킹+길이제한 결합', () => {
    const r = sanitizeOutput('xoxb-123456789012-secretsecret ' + 'b'.repeat(300), 200)
    expect(r.text).toContain('redacted')
    expect(r.overflow).toBe(true)
  })
})
