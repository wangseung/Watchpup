// 뷰 레이어 — 주간 요약 / 할 일 탭. 멘션 목록/상세와 무관한 독립 집계 화면.
// panel 함수는 nav 레지스트리로만 호출(순환 import 없음).
import { state, sortedMentions, nav } from './store.js'
import { playbookById } from './playbooks.js'
import { CAT_LABEL, CAT_ORDER, shortText, weekStart } from './format.js'

// 선택 기간 → [start, end) epoch ms + 표시 라벨
function digestRange(period, now = Date.now()) {
  const DAY = 86400_000
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const ds = dayStart.getTime()
  const fmt = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}` }
  switch (period) {
    case 'today': return { start: ds, end: ds + DAY, label: `오늘 (${fmt(ds)})` }
    case 'last-week': { const s = weekStart(now) - 7 * DAY; return { start: s, end: s + 7 * DAY, label: `지난 주 (${fmt(s)}~${fmt(s + 6 * DAY)})` } }
    case '7d': return { start: now - 7 * DAY, end: now + DAY, label: `최근 7일 (${fmt(now - 7 * DAY)}~${fmt(now)})` }
    case '30d': return { start: now - 30 * DAY, end: now + DAY, label: `최근 30일 (${fmt(now - 30 * DAY)}~${fmt(now)})` }
    case 'all': return { start: 0, end: now + DAY, label: '전체' }
    case 'this-week':
    default: { const s = weekStart(now); return { start: s, end: s + 7 * DAY, label: `이번 주 (${fmt(s)}~${fmt(s + 6 * DAY)})` } }
  }
}

// ---- 기간별 요약(선택 기간의 주요 이슈·내용 모아보기) — 분석 없이 기존 결과 집계 ----
export function renderDigest() {
  const body = document.getElementById('digest-body')
  const range = document.getElementById('digest-range')
  if (!body) return
  const period = document.getElementById('digest-period')?.value || 'this-week'
  const { start, end, label } = digestRange(period)
  if (range) range.textContent = label
  const items = [...state.mentions.values()].filter((m) => m.mentionedAt >= start && m.mentionedAt < end)
  body.innerHTML = ''
  if (!items.length) {
    const p = document.createElement('p')
    p.className = 'hint'
    p.textContent = '이 기간에 항목이 없어요. (멘션 탭에서 수집됩니다)'
    body.appendChild(p)
    return
  }
  // 카테고리 순서로 그룹핑(미분류는 마지막)
  const groups = new Map()
  for (const key of CAT_ORDER) groups.set(key, [])
  groups.set('_', [])
  for (const m of items) {
    const c = (m.analysis && m.analysis.category) || '_'
    ;(groups.get(c) || groups.get('_')).push(m)
  }
  for (const [key, ms] of groups) {
    if (!ms.length) continue
    const sec = document.createElement('div')
    sec.className = 'digest-group'
    const h = document.createElement('div')
    h.className = 'digest-group-title'
    h.textContent = (CAT_LABEL[key] || '미분류') + ` (${ms.length})`
    sec.appendChild(h)
    ms.sort((a, b) => b.mentionedAt - a.mentionedAt)
    for (const m of ms) {
      const row = document.createElement('div')
      row.className = 'digest-item'
      const openTodos = (m.todos || []).filter((t) => !t.done).length
      const head = (m.analysis && m.analysis.headline) || shortText(m.text, 40)
      const line = document.createElement('div')
      line.className = 'digest-line'
      const ch = document.createElement('span')
      ch.className = 'digest-ch'
      ch.textContent = m.channelName || m.channel
      const hd = document.createElement('span')
      hd.className = 'digest-head'
      hd.textContent = head
      line.append(ch, hd)
      if (openTodos > 0) {
        const b = document.createElement('span')
        b.className = 'todo-badge open'
        b.textContent = '할 일 ' + openTodos
        line.appendChild(b)
      }
      const sum = document.createElement('div')
      sum.className = 'digest-sum'
      sum.textContent = (m.analysis && m.analysis.summary) ? shortText(m.analysis.summary, 120) : ''
      row.append(line, sum)
      row.addEventListener('click', () => {
        nav.ensureMentionsTab()
        nav.select(m.id)
      })
      sec.appendChild(row)
    }
    body.appendChild(sec)
  }
}

// ---- 할 일 탭: 미완료 todo를 스레드별로 모아 체크리스트 ----
let todosShowDone = false
export function renderTodosView() {
  const body = document.getElementById('todos-body')
  const countEl = document.getElementById('todos-count')
  if (!body) return
  // 스레드별로 (완료 보기 여부에 따라) 할 일이 있는 멘션만
  const groups = sortedMentions()
    .map((m) => ({ m, todos: (m.todos || []).map((t, i) => ({ t, i })).filter(({ t }) => todosShowDone || !t.done) }))
    .filter((g) => g.todos.length)
  const openTotal = sortedMentions().reduce((n, m) => n + (m.todos || []).filter((t) => !t.done).length, 0)
  if (countEl) countEl.textContent = `남은 할 일 ${openTotal}개 · ${groups.length}개 스레드`
  body.innerHTML = ''
  if (!groups.length) {
    const p = document.createElement('p')
    p.className = 'hint'
    p.textContent = todosShowDone ? '할 일이 없어요.' : '남은 할 일이 없어요 🎉'
    body.appendChild(p)
    return
  }
  for (const { m, todos } of groups) {
    const card = document.createElement('div')
    card.className = 'todos-group'
    const head = document.createElement('div')
    head.className = 'todos-group-head'
    const ch = document.createElement('span')
    ch.className = 'todos-group-ch'
    ch.textContent = m.channelName || m.channel
    const openN = (m.todos || []).filter((t) => !t.done).length
    const cnt = document.createElement('span')
    cnt.className = 'todo-badge ' + (openN ? 'open' : 'done')
    cnt.textContent = openN ? '할 일 ' + openN : '✓ 완료'
    const open = document.createElement('button')
    open.type = 'button'
    open.className = 'todos-group-open'
    open.textContent = '열기 →'
    open.addEventListener('click', () => { nav.ensureMentionsTab(); nav.select(m.id) })
    head.append(ch, cnt, open)
    card.appendChild(head)
    if (m.analysis && m.analysis.headline) {
      const hd = document.createElement('div')
      hd.className = 'todos-group-headline'
      hd.textContent = m.analysis.headline
      card.appendChild(hd)
    }
    const ul = document.createElement('ul')
    ul.className = 'todos-list'
    for (const { t, i } of todos) {
      const li = document.createElement('li')
      if (t.done) li.classList.add('done')
      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.checked = !!t.done
      cb.addEventListener('change', () => {
        t.done = cb.checked
        window.watchpup.todoToggle(m.id, i).catch((e) => console.error('todoToggle 실패', e))
        renderTodosView()
        nav.renderList()
      })
      const span = document.createElement('span')
      span.className = 'todo-text'
      span.textContent = t.text
      li.append(cb, span)
      // 이 할 일이 자동 실행 가능하면 ▶ 버튼
      const pb = t.playbookId ? playbookById(t.playbookId) : null
      if (pb && pb.enabled && !t.done) {
        const run = document.createElement('button')
        run.type = 'button'
        run.className = 'todo-run'
        run.textContent = '▶ ' + pb.name
        run.addEventListener('click', (e) => { e.stopPropagation(); nav.runAction(m.id, t.playbookId) })
        li.appendChild(run)
      }
      ul.appendChild(li)
    }
    card.appendChild(ul)
    body.appendChild(card)
  }
}

// 뷰 전용 바인딩 (완료 보기 토글 / 주간 싱크)
const todosShowDoneEl = document.getElementById('todos-show-done')
if (todosShowDoneEl) {
  todosShowDoneEl.addEventListener('change', () => {
    todosShowDone = todosShowDoneEl.checked
    renderTodosView()
  })
}
const digestSyncBtn = document.getElementById('digest-sync')
if (digestSyncBtn) {
  digestSyncBtn.addEventListener('click', () => {
    digestSyncBtn.disabled = true
    nav.refresh().then(renderDigest).finally(() => { digestSyncBtn.disabled = false })
  })
}
document.getElementById('digest-period')?.addEventListener('change', () => renderDigest())
