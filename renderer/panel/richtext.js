// 표현 레이어 — 리치텍스트/마크다운을 DOM으로 렌더(링크·멘션·채널·인라인코드·코드블록).
// 자기완결적: 공유 앱 상태 없음. 링크 클릭만 window.watchpup.openExternal 사용.

// URL·@멘션·#채널을 링크/스팬으로 el에 append
export function appendRichText(el, text) {
  const re = /(https?:\/\/[^\s<>]+)|(@[\w가-힣._-]+)|(#[\w가-힣._-]+)/g
  let last = 0
  let mm
  while ((mm = re.exec(text)) !== null) {
    if (mm.index > last) el.appendChild(document.createTextNode(text.slice(last, mm.index)))
    if (mm[1]) {
      const url = mm[1]
      const a = document.createElement('a')
      a.className = 'tlink'
      a.href = '#'
      a.textContent = url.length > 60 ? url.slice(0, 57) + '…' : url
      a.title = url
      a.addEventListener('click', (e) => {
        e.preventDefault()
        window.watchpup.openExternal(url)
      })
      el.appendChild(a)
    } else if (mm[2]) {
      const s = document.createElement('span')
      s.className = 'mention'
      s.textContent = mm[2]
      el.appendChild(s)
    } else if (mm[3]) {
      const s = document.createElement('span')
      s.className = 'chan'
      s.textContent = mm[3]
      el.appendChild(s)
    }
    last = mm.index + mm[0].length
  }
  if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)))
}

// 인라인: `code` → <code>, 나머지는 링크/멘션/채널 처리
export function appendInline(el, text) {
  const re = /`([^`\n]+)`/g
  let last = 0
  let mm
  while ((mm = re.exec(text)) !== null) {
    if (mm.index > last) appendRichText(el, text.slice(last, mm.index))
    const c = document.createElement('code')
    c.className = 'code-inline'
    c.textContent = mm[1]
    el.appendChild(c)
    last = mm.index + mm[0].length
  }
  if (last < text.length) appendRichText(el, text.slice(last))
}

export function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text)
  } catch (e) {
    /* fall through */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
  } catch (e) {
    /* ignore */
  }
  document.body.removeChild(ta)
  return Promise.resolve()
}

// 코드 블록 요소 생성: 복사 버튼 + (길면) 접기/펼치기
const CODE_COLLAPSE_LINES = 12
export function makeCodeBlock(codeText) {
  const wrap = document.createElement('div')
  wrap.className = 'code-wrap'
  const lineCount = codeText.split('\n').length
  const long = lineCount > CODE_COLLAPSE_LINES
  if (long) wrap.classList.add('collapsed')

  const bar = document.createElement('div')
  bar.className = 'code-bar'

  const meta = document.createElement('span')
  meta.className = 'code-meta'
  meta.textContent = long ? `${lineCount}줄` : ''
  bar.appendChild(meta)

  if (long) {
    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'code-btn code-toggle'
    const setLabel = () => (toggle.textContent = wrap.classList.contains('collapsed') ? '펼치기' : '접기')
    setLabel()
    toggle.addEventListener('click', () => {
      wrap.classList.toggle('collapsed')
      setLabel()
    })
    bar.appendChild(toggle)
  }

  const copy = document.createElement('button')
  copy.type = 'button'
  copy.className = 'code-btn code-copy'
  copy.textContent = '복사'
  copy.addEventListener('click', () => {
    copyToClipboard(codeText).then(() => {
      copy.textContent = '복사됨'
      copy.classList.add('ok')
      setTimeout(() => {
        copy.textContent = '복사'
        copy.classList.remove('ok')
      }, 1200)
    })
  })
  bar.appendChild(copy)

  const pre = document.createElement('pre')
  pre.className = 'code-block'
  const code = document.createElement('code')
  code.textContent = codeText
  pre.appendChild(code)

  wrap.append(bar, pre)
  return wrap
}

// 마크다운: ```펜스 코드블록``` → 복사·접기 가능한 코드 카드, 그 외엔 인라인 처리
export function appendMarkdown(el, text) {
  text = String(text || '')
  const fence = /```(?:[a-zA-Z0-9_+-]+\n)?([\s\S]*?)```/g
  let last = 0
  let mm
  while ((mm = fence.exec(text)) !== null) {
    if (mm.index > last) appendInline(el, text.slice(last, mm.index))
    el.appendChild(makeCodeBlock(mm[1].replace(/^\n+/, '').replace(/\n+$/, '')))
    last = mm.index + mm[0].length
  }
  if (last < text.length) appendInline(el, text.slice(last))
}

// 하위 호환 별칭 — 마크다운(코드블록) 포함
export const appendLinkified = appendMarkdown
