/**
 * Claude Skill(SKILL.md) → 워크플로우(playbook) 필드 변환.
 * frontmatter의 name/description + 본문을 name/when/steps로 매핑(순수 함수).
 */
export interface ParsedSkill {
  name: string
  description: string
  steps: string
}

/** SKILL.md 텍스트에서 name/description(frontmatter) + 본문을 뽑는다. frontmatter 없으면 본문 전체가 steps. */
export function parseSkillMd(text: string): ParsedSkill {
  const src = (text ?? '').replace(/\r\n/g, '\n')
  let name = ''
  let description = ''
  let body = src.trim()
  const fm = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (fm) {
    const front = fm[1]
    body = fm[2].trim()
    const unquote = (s: string): string => s.trim().replace(/^["']|["']$/g, '').trim()
    const nm = front.match(/^name:\s*(.+)$/m)
    if (nm) name = unquote(nm[1])
    const ds = front.match(/^description:\s*(.+)$/m)
    if (ds) description = unquote(ds[1])
  }
  return { name, description, steps: body }
}
