import { describe, it, expect } from 'vitest'
import { playbookActionPrompt } from './prompts.js'
import type { Playbook } from '../config/schema.js'

const pb: Playbook = { id: 'research', name: '관련 자료 조사', when: '', steps: '스레드 관련 자료를 찾아 정리', enabled: true, write: false }

describe('playbookActionPrompt', () => {
  it('추가 지시가 있으면 프롬프트에 우선 반영으로 포함', () => {
    const p = playbookActionPrompt({ playbook: pb, context: '맥락', extra: '표로 정리해줘' })
    expect(p).toContain('추가 지시')
    expect(p).toContain('표로 정리해줘')
  })

  it('추가 지시가 없으면 해당 줄을 넣지 않는다', () => {
    const p = playbookActionPrompt({ playbook: pb, context: '맥락' })
    expect(p).not.toContain('추가 지시(우선')
  })

  it('세션 재사용 대비 — JSON이 아닌 한국어 산문 보고를 명시', () => {
    const p = playbookActionPrompt({ playbook: pb, context: '맥락' })
    expect(p).toMatch(/JSON.*아니라|산문/)
  })
})
