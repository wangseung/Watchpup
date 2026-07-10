/**
 * Obsidian 멘션 노트 렌더/저장 + todo 체크박스 라운드트립 파싱.
 * 하나의 책임: Mention → 마크다운(및 그 역).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Mention, Todo } from '../types.js'
import { sanitizeOutput } from '../safety/redact.js'

export function slugify(s: string, max = 50): string {
  const out = s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, max)
  return out || 'note'
}

function ymd(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function noteFilename(m: Mention): string {
  return `${ymd(m.mentionedAt)}-${slugify(m.text)}-${m.id.slice(0, 6)}.md`
}

export function renderMentionNote(m: Mention): string {
  const a = m.analysis
  const todos = m.todos.map((t) => `- [${t.done ? 'x' : ' '}] ${sanitizeOutput(t.text).text}`).join('\n')
  const lines = [
    '---',
    'source: slack',
    `channel: ${JSON.stringify(m.channelName ?? m.channel)}`,
    `thread_ts: ${JSON.stringify(m.threadTs)}`,
    m.permalink ? `permalink: ${m.permalink}` : null,
    `author: ${JSON.stringify(m.authorName ?? m.authorId)}`,
    `mentioned_at: ${new Date(m.mentionedAt).toISOString()}`,
    `status: ${m.status}`,
    m.sessionId ? `session_id: ${m.sessionId}` : null,
    'tags: [watchpup, mention]',
    '---',
    '',
    `# @멘션 — ${sanitizeOutput(m.text).text}`,
    '',
    '## 요약',
    a ? sanitizeOutput(a.summary).text : '',
    '',
    '## 조언',
    a ? sanitizeOutput(a.advice).text : '',
    '',
    '## Todo',
    todos,
    '',
    '## 답장 초안',
    a && a.draftReply ? `> (승인 시 Slack 게시)\n\n${sanitizeOutput(a.draftReply).text}` : '(없음)',
    '',
  ].filter((l) => l !== null)
  return lines.join('\n')
}

export function parseTodos(markdown: string): Todo[] {
  const todos: Todo[] = []
  const headingMatch = /^## Todo\r?\n/m.exec(markdown)
  if (!headingMatch) return todos
  const sectionStart = headingMatch.index + headingMatch[0].length
  const nextHeading = /^## /m.exec(markdown.slice(sectionStart))
  const section = nextHeading ? markdown.slice(sectionStart, sectionStart + nextHeading.index) : markdown.slice(sectionStart)
  const re = /^- \[( |x)\] (.+)$/gm
  let mm: RegExpExecArray | null
  while ((mm = re.exec(section)) !== null) {
    todos.push({ done: mm[1] === 'x', text: mm[2].trim() })
  }
  return todos
}

export function saveMentionNote(
  obsidian: { enabled: boolean; vaultPath: string; folder: string },
  m: Mention,
): string | null {
  if (!obsidian.enabled || !obsidian.vaultPath) return null
  const dir = join(obsidian.vaultPath, obsidian.folder)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const filepath = join(dir, noteFilename(m))
  writeFileSync(filepath, renderMentionNote(m), 'utf8')
  return filepath
}
