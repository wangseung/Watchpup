/**
 * 심심할 때 펫이 던질 위트 한 줄(quip)을 claude로 생성.
 * 도구/MCP/세션 없이 가볍게 한 번에 여러 줄을 만들어 캐시해두고 쓴다(비용 최소).
 */
import type { WatchpupConfig } from '../config/schema.js'
import { Keychain } from '../secrets/keychain.js'
import { runClaude } from '../agent/executor.js'

export interface QuipContext {
  unread: number
  hour: number
}

function quipSystem(botName: string): string {
  return [
    `너는 "${botName}", 사용자의 귀여운 데스크톱 펫이야.`,
    '심심할 때 툭 던지는 짧고 위트있는 혼잣말을 만든다.',
    '규칙: 한국어, 각 줄 35자 이내, 이모지는 최대 1개, 총 8줄.',
    '오직 혼잣말 8줄만 한 줄에 하나씩 출력(번호·불릿·따옴표·다른 설명 금지).',
  ].join('\n')
}

function quipUser(ctx: QuipContext): string {
  const tod = ctx.hour < 6 ? '새벽' : ctx.hour < 12 ? '오전' : ctx.hour < 18 ? '오후' : '저녁'
  const mention = ctx.unread > 0 ? `안 읽은 멘션이 ${ctx.unread}개 있어` : '안 읽은 멘션은 없어'
  return `지금 ${tod}(${ctx.hour}시)이고 ${mention}. 이 상황에 어울리는 혼잣말 8개.`
}

/** LLM 출력에서 한 줄씩 정제 (번호/불릿/따옴표 제거, 길이 제한) */
export function parseQuips(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^["'“]+|["'”]+$/g, '').trim())
    .filter((l) => l.length > 0 && l.length <= 60)
    .slice(0, 8)
}

export async function generateQuips(
  deps: { config: WatchpupConfig; keychain: Keychain },
  ctx: QuipContext,
): Promise<string[]> {
  const result = await runClaude({
    prompt: quipUser(ctx),
    config: deps.config,
    agents: {},
    allowedTools: [],
    disallowedTools: [],
    systemPrompt: quipSystem(deps.config.botName),
    isResume: false,
    permissionMode: 'default',
  })
  return parseQuips(result.text)
}
