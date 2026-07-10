import { describe, it, expect } from 'vitest'
import { parseSkillMd } from './skill-import.js'

describe('parseSkillMd', () => {
  it('frontmatter name/description + 본문 분리', () => {
    const md = `---\nname: pdf-filler\ndescription: Fill PDF forms from data\n---\n# PDF Filler\n\n1. Read the form\n2. Fill fields`
    const r = parseSkillMd(md)
    expect(r.name).toBe('pdf-filler')
    expect(r.description).toBe('Fill PDF forms from data')
    expect(r.steps).toBe('# PDF Filler\n\n1. Read the form\n2. Fill fields')
  })

  it('따옴표로 감싼 값 처리', () => {
    const r = parseSkillMd(`---\nname: "My Skill"\ndescription: 'do a thing'\n---\nbody`)
    expect(r.name).toBe('My Skill')
    expect(r.description).toBe('do a thing')
  })

  it('frontmatter 없으면 본문 전체가 steps', () => {
    const r = parseSkillMd('그냥 지침만 있는 파일')
    expect(r.name).toBe('')
    expect(r.description).toBe('')
    expect(r.steps).toBe('그냥 지침만 있는 파일')
  })

  it('CRLF 정규화', () => {
    const r = parseSkillMd('---\r\nname: x\r\n---\r\nbody line')
    expect(r.name).toBe('x')
    expect(r.steps).toBe('body line')
  })
})
