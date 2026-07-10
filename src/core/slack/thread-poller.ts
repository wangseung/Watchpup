/**
 * User Token 기반 스레드 후속 폴링.
 * search.messages는 "@나"를 재멘션하지 않은 후속 답글은 잡지 못한다. 봇이 없는(user-search
 * 전용) 채널에서도 내가 멘션됐던 스레드의 새 답글을 놓치지 않도록 conversations.replies로
 * 추적 중인 스레드들을 주기적으로 훑는다. 중복/스레드 root 판단은 엔진(handleMention)이 처리.
 */
import type { WebClient } from '@slack/web-api'
import type { RawMention } from './search-poller.js'
import { logger } from '../observability/logger.js'

interface RepliesMessage {
  ts?: string
  user?: string
  bot_id?: string
  text?: string
}

export class ThreadFollowPoller {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly client: WebClient,
    private readonly listThreads: () => Array<{ channel: string; threadTs: string }>,
    private readonly getCursor: (channel: string, threadTs: string) => string | undefined,
    private readonly setCursor: (channel: string, threadTs: string, ts: string) => void,
    private readonly mySlackUserId: string,
    private readonly intervalSec: number,
    private readonly onFollowup: (raw: RawMention) => void,
  ) {}

  start(): void {
    if (this.timer) return
    void this.poll() // 즉시 1회
    this.timer = setInterval(() => void this.poll(), Math.max(15, this.intervalSec) * 1000)
    logger.info('ThreadFollowPoller 시작', { intervalSec: this.intervalSec })
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async poll(): Promise<void> {
    for (const { channel, threadTs } of this.listThreads()) {
      await this.pollThread(channel, threadTs)
    }
  }

  private async pollThread(channel: string, threadTs: string): Promise<void> {
    const cursor = this.getCursor(channel, threadTs)
    try {
      const res = (await this.client.conversations.replies({
        channel,
        ts: threadTs,
        oldest: cursor || threadTs,
        inclusive: false,
        limit: 30,
      })) as { messages?: RepliesMessage[] }
      const messages = res.messages ?? []
      let maxTs = cursor
      for (const msg of messages) {
        if (!msg.ts) continue
        if (cursor && parseFloat(msg.ts) <= parseFloat(cursor)) continue
        if (!maxTs || parseFloat(msg.ts) > parseFloat(maxTs)) maxTs = msg.ts
        if (!msg.user || msg.bot_id || msg.user === this.mySlackUserId) continue
        this.onFollowup({ channel, threadTs, messageTs: msg.ts, authorId: msg.user, text: msg.text || '' })
      }
      if (maxTs && maxTs !== cursor) this.setCursor(channel, threadTs, maxTs)
    } catch (err) {
      logger.warn('스레드 후속 폴링 실패', { channel, threadTs, err: String(err) })
    }
  }
}
