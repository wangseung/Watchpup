import { copyToClipboard } from './richtext.js'

const KIND_LABEL = { jira: 'Jira', github: 'GitHub', slack: 'Slack', notion: 'Notion', figma: 'Figma', web: 'Web' }
const state = { items: [], selectedId: '', query: '', kind: '', includeCompleted: false, loading: false }

const listSelect = document.getElementById('work-list-select')
const listEl = document.getElementById('work-list')
const detailEl = document.getElementById('work-detail')
const hintEl = document.getElementById('work-source-hint')

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

function formatDue(value) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  return new Intl.DateTimeFormat('ko-KR', {
    ...(sameYear ? {} : { year: 'numeric' }), month: 'short', day: 'numeric',
  }).format(date)
}

function filteredItems() {
  const query = state.query.trim().toLowerCase()
  return state.items.filter((item) => {
    if (state.kind && !item.links?.some((link) => link.kind === state.kind)) return false
    if (!query) return true
    return [item.title, item.notes, ...(item.links || []).flatMap((link) => [link.title, link.url])]
      .filter(Boolean).join(' ').toLowerCase().includes(query)
  })
}

function renderList() {
  listEl.replaceChildren()
  if (state.loading) {
    listEl.append(el('p', 'list-empty', 'Reminder 불러오는 중…'))
    return
  }
  const items = filteredItems()
  if (!items.length) {
    listEl.append(el('p', 'list-empty', state.items.length ? '조건에 맞는 작업이 없어요' : '이 목록에 작업이 없어요'))
    return
  }
  for (const item of items) {
    const card = el('button', `work-card${item.id === state.selectedId ? ' selected' : ''}${item.completed ? ' completed' : ''}`)
    card.type = 'button'
    card.addEventListener('click', () => selectItem(item.id))

    const top = el('div', 'work-card-top')
    top.append(el('span', `work-check${item.completed ? ' done' : ''}`, item.completed ? '✓' : ''))
    top.append(el('span', 'work-card-title', item.title || '제목 없음'))
    card.append(top)

    const meta = el('div', 'work-card-meta')
    for (const kind of [...new Set((item.links || []).map((link) => link.kind))].slice(0, 4)) {
      meta.append(el('span', `work-kind kind-${kind}`, KIND_LABEL[kind] || 'Web'))
    }
    if (item.dueAt) meta.append(el('span', `work-due${item.dueAt < Date.now() && !item.completed ? ' overdue' : ''}`, formatDue(item.dueAt)))
    card.append(meta)
    listEl.append(card)
  }
}

function renderEmpty() {
  detailEl.innerHTML = '<div class="empty"><div class="empty-mark">⌁</div><p class="empty-title">왼쪽에서 작업을 골라보세요</p><p class="empty-sub">Reminder 메모에 업무 링크를 한곳에 모아볼 수 있습니다.</p></div>'
}

function linkRow(link) {
  const row = el('div', 'work-link-row')
  const badge = el('span', `work-link-badge kind-${link.kind}`, KIND_LABEL[link.kind] || 'Web')
  const info = el('div', 'work-link-info')
  info.append(el('div', 'work-link-title', link.title || link.host))
  info.append(el('div', 'work-link-host', link.host))
  const actions = el('div', 'work-link-actions')
  const copy = el('button', '', '복사')
  copy.type = 'button'
  copy.addEventListener('click', async () => {
    await copyToClipboard(link.url)
    copy.textContent = '완료'
    setTimeout(() => { copy.textContent = '복사' }, 1000)
  })
  const open = el('button', 'primary', '↗')
  open.type = 'button'
  open.title = '외부에서 열기'
  open.setAttribute('aria-label', `${KIND_LABEL[link.kind] || '링크'} 외부에서 열기`)
  open.addEventListener('click', () => window.watchpup.openExternal(link.url))
  actions.append(copy, open)
  row.append(badge, info, actions)
  return row
}

function renderDetail() {
  const item = state.items.find((candidate) => candidate.id === state.selectedId)
  if (!item) return renderEmpty()
  detailEl.replaceChildren()

  const header = el('header', 'work-detail-head')
  const titleWrap = el('div', 'work-detail-title-wrap')
  const kicker = el('div', 'work-detail-kicker', `${item.account} / ${item.listName}`)
  const title = el('h1', '', item.title || '제목 없음')
  titleWrap.append(kicker, title)
  const complete = el('button', item.completed ? 'work-complete done' : 'work-complete', item.completed ? '✓ 완료' : '완료로 표시')
  complete.type = 'button'
  complete.addEventListener('click', async () => {
    complete.disabled = true
    try {
      await window.watchpup.workReminderComplete(item.id, !item.completed)
      await refreshWorkView({ preserveSelection: true })
    } catch (error) {
      hintEl.textContent = error?.message || '완료 상태를 바꾸지 못했습니다.'
      complete.disabled = false
    }
  })
  header.append(titleWrap, complete)
  detailEl.append(header)

  const body = el('div', 'work-detail-body')
  const notesSection = el('section', 'work-section')
  notesSection.append(el('h2', '', '메모'))
  notesSection.append(el('div', `work-notes${item.notes ? '' : ' empty-note'}`, item.notes || '메모가 없습니다.'))
  body.append(notesSection)

  const linksSection = el('section', 'work-section')
  const linkHead = el('div', 'work-section-head')
  linkHead.append(el('h2', '', '연결된 링크'), el('span', 'work-link-count', `${item.links?.length || 0}`))
  linksSection.append(linkHead)
  const links = el('div', 'work-links')
  if (item.links?.length) item.links.forEach((link) => links.append(linkRow(link)))
  else links.append(el('p', 'work-section-empty', '아직 연결된 링크가 없습니다.'))
  linksSection.append(links)

  const form = el('form', 'work-link-form')
  const kind = el('select')
  for (const value of ['jira', 'github', 'slack', 'notion', 'figma', 'web']) {
    const option = el('option', '', KIND_LABEL[value])
    option.value = value
    kind.append(option)
  }
  const linkTitle = el('input')
  linkTitle.type = 'text'; linkTitle.placeholder = '링크 이름 (선택)'; linkTitle.autocomplete = 'off'
  const url = el('input')
  url.type = 'url'; url.placeholder = 'https://…'; url.required = true; url.autocomplete = 'off'
  const add = el('button', 'primary', '추가')
  add.type = 'submit'
  form.append(kind, linkTitle, url, add)
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    add.disabled = true
    try {
      await window.watchpup.workReminderLinkAdd(item.id, { kind: kind.value, title: linkTitle.value, url: url.value })
      await refreshWorkView({ preserveSelection: true })
    } catch (error) {
      hintEl.textContent = error?.message || '링크를 추가하지 못했습니다.'
      add.disabled = false
    }
  })
  linksSection.append(form)
  body.append(linksSection)
  detailEl.append(body)
}

function selectItem(id) {
  state.selectedId = id
  renderList()
  renderDetail()
}

export async function refreshWorkView(options = {}) {
  if (!listSelect?.value) return
  state.loading = true
  hintEl.textContent = ''
  renderList()
  try {
    state.items = await window.watchpup.workItems(listSelect.value, state.includeCompleted)
    if (!options.preserveSelection || !state.items.some((item) => item.id === state.selectedId)) {
      state.selectedId = state.items[0]?.id || ''
    }
    renderList()
    renderDetail()
    hintEl.textContent = `${state.items.length}개 작업 · Apple Reminders와 동기화`
  } catch (error) {
    state.items = []
    state.selectedId = ''
    renderList()
    renderEmpty()
    hintEl.textContent = error?.message || 'Reminder를 읽지 못했습니다. macOS 권한을 확인해주세요.'
  } finally {
    state.loading = false
    renderList()
  }
}

export async function initWorkView() {
  if (!listSelect) return
  try {
    const result = await window.watchpup.workLists()
    listSelect.replaceChildren()
    for (const list of result.lists || []) {
      const option = el('option', '', `${list.name} · ${list.account}`)
      option.value = list.id
      option.selected = list.id === result.selectedId
      listSelect.append(option)
    }
    if (!result.lists?.length) {
      hintEl.textContent = '사용 가능한 Reminder 목록이 없습니다.'
      return
    }
    hintEl.textContent = result.goalBarMatched ? 'GoalBar에서 사용하던 Reminder 목록을 불러왔습니다.' : '사용할 Reminder 목록을 선택해주세요.'
    await refreshWorkView()
  } catch (error) {
    hintEl.textContent = error?.message || 'Reminder 목록을 읽지 못했습니다.'
  }
}

listSelect?.addEventListener('change', async () => {
  await window.watchpup.workListSelect(listSelect.value)
  state.selectedId = ''
  await refreshWorkView()
})
document.getElementById('work-refresh')?.addEventListener('click', () => refreshWorkView({ preserveSelection: true }))
document.getElementById('work-search')?.addEventListener('input', (event) => {
  state.query = event.target.value
  renderList()
})
document.getElementById('work-kind-filter')?.addEventListener('change', (event) => {
  state.kind = event.target.value
  renderList()
})
document.getElementById('work-show-completed')?.addEventListener('change', async (event) => {
  state.includeCompleted = event.target.checked
  await refreshWorkView({ preserveSelection: true })
})
