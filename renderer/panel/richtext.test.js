// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { appendRichText, appendInline, appendMarkdown } from './richtext.js'

beforeEach(() => {
  // 링크 클릭 핸들러가 참조
  globalThis.window.watchpup = { openExternal: () => {} }
})

function div() { return document.createElement('div') }

describe('appendRichText', () => {
  it('URL은 a.tlink, @멘션은 .mention, #채널은 .chan', () => {
    const el = div()
    appendRichText(el, '보세요 https://x.com 님 @홍길동 이 #dev 에서')
    expect(el.querySelector('a.tlink')?.title).toBe('https://x.com')
    expect(el.querySelector('span.mention')?.textContent).toBe('@홍길동')
    expect(el.querySelector('span.chan')?.textContent).toBe('#dev')
  })
  it('일반 텍스트만이면 링크 없음', () => {
    const el = div()
    appendRichText(el, '그냥 텍스트')
    expect(el.querySelector('a')).toBeNull()
    expect(el.textContent).toBe('그냥 텍스트')
  })
})

describe('appendInline', () => {
  it('`code`는 code.code-inline', () => {
    const el = div()
    appendInline(el, '이 `foo()` 실행')
    expect(el.querySelector('code.code-inline')?.textContent).toBe('foo()')
  })
})

describe('appendMarkdown', () => {
  it('```펜스```는 코드 카드(pre.code-block)로', () => {
    const el = div()
    appendMarkdown(el, '설명\n```\nline1\nline2\n```\n끝')
    const pre = el.querySelector('pre.code-block code')
    expect(pre?.textContent).toBe('line1\nline2')
    expect(el.querySelector('.code-copy')).not.toBeNull()
  })
  it('12줄 초과 코드블록은 collapsed + 펼치기 버튼', () => {
    const el = div()
    const code = Array.from({ length: 20 }, (_, i) => 'L' + i).join('\n')
    appendMarkdown(el, '```\n' + code + '\n```')
    expect(el.querySelector('.code-wrap.collapsed')).not.toBeNull()
    expect(el.querySelector('.code-toggle')?.textContent).toBe('펼치기')
  })
  it('언어 지정 펜스도 코드만 추출', () => {
    const el = div()
    appendMarkdown(el, '```json\n{"a":1}\n```')
    expect(el.querySelector('pre.code-block code')?.textContent).toBe('{"a":1}')
  })
})
