import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
const document = new JSDOM(html).window.document

describe('잔소리 베타 설정', () => {
  it('별도 설정 탭을 제공하고 기본값은 꺼져 있다', () => {
    const tab = document.querySelector('.sset-tab[data-sset="nagging"]')
    const enabled = document.querySelector('input[name="naggingEnabled"]')

    expect(tab?.textContent).toContain('잔소리')
    expect(enabled?.checked).toBe(false)
  })

  it('몇 분 단위의 랜덤 범위를 설정할 수 있다', () => {
    const min = document.querySelector('input[name="naggingMinMinutes"]')
    const max = document.querySelector('input[name="naggingMaxMinutes"]')

    expect(min?.value).toBe('5')
    expect(max?.value).toBe('12')
  })
})
