import { describe, it, expect } from 'vitest'
import { idleUnreadLine, pickIdleLine, IDLE_CHATTER } from './idle.js'

describe('idleUnreadLine', () => {
  it('5개 이상은 강한 리마인드', () => expect(idleUnreadLine(5)).toContain('5개'))
  it('1~4개는 약한 리마인드', () => expect(idleUnreadLine(2)).toContain('2건'))
  it('0개는 null', () => expect(idleUnreadLine(0)).toBeNull())
})

describe('pickIdleLine', () => {
  it('안 읽음 있으면 리마인드 우선(quip 소모 안 함)', () => {
    const quips = ['위트1']
    const line = pickIdleLine(3, quips)
    expect(line).toContain('3건')
    expect(quips).toEqual(['위트1']) // 소모 안 됨
  })
  it('안 읽음 0 + quip 있으면 quip을 하나 꺼냄', () => {
    const quips = ['위트1', '위트2']
    expect(pickIdleLine(0, quips)).toBe('위트1')
    expect(quips).toEqual(['위트2'])
  })
  it('안 읽음 0 + quip 없으면 기본 풀에서(rand 주입)', () => {
    expect(pickIdleLine(0, [], IDLE_CHATTER, () => 0)).toBe(IDLE_CHATTER[0])
  })
})
