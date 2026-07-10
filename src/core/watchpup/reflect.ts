/**
 * 자가발전 루프. 두 경로로 "교훈"을 만든다.
 *  - selfCritique: 스레드+출력을 판사 LLM이 채점 → {score(1~5), lesson|null}
 *  - distillFeedback: 내(사용자) 피드백을 재사용 가능한 짧은 교훈 한 줄로 증류
 * 둘 다 도구 없이(읽기/쓰기 X) 새 세션으로 짧게 실행 — 스레드 세션은 건드리지 않는다.
 */
import type { WatchpupConfig } from '../config/schema.js'
import { runClaude } from '../agent/executor.js'
import { logger } from '../observability/logger.js'

export interface ReflectDeps {
  config: WatchpupConfig
  runClaudeFn?: typeof runClaude
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s < 0 || e <= s) return null
    return JSON.parse(text.slice(s, e + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

async function judge(deps: ReflectDeps, systemPrompt: string, prompt: string): Promise<Record<string, unknown> | null> {
  const run = deps.runClaudeFn ?? runClaude
  const result = await run({
    prompt,
    config: deps.config,
    agents: {},
    allowedTools: [],
    disallowedTools: [],
    systemPrompt,
    isResume: false,
    permissionMode: 'default',
  })
  return parseJson(result.text)
}

/** 자가평가: 이 분석이 스레드에 잘 답했는가. lesson은 다음에 반영할 구체적·재사용 가능한 한 줄. */
export async function selfCritique(
  deps: ReflectDeps,
  input: { threadText: string; output: string; lowScore?: number },
): Promise<{ score: number; lesson: string | null }> {
  try {
    const sys = [
      '너는 비서 "watchpup"의 결과물을 냉정히 평가하는 리뷰어다.',
      '주어진 Slack 스레드와 watchpup의 출력(JSON)을 보고, 사용자에게 실제로 도움이 됐는지 평가한다.',
      input.lowScore
        ? `사용자가 이 출력에 낮은 만족도(${input.lowScore}/5)를 매겼다. 무엇이 부족했는지 원인을 짚고 개선 지침을 뽑아라.`
        : '',
      '아래 JSON만 출력(다른 텍스트 금지): {"score": 1~5 정수, "lesson": "다음에 이 유형을 더 잘 처리하기 위한 구체적·재사용 가능한 지침 한 줄(한국어). 개선점이 없으면 null"}',
      'lesson은 이번 건에만 국한된 사실이 아니라, 같은 워크플로우의 다음 실행에도 적용될 일반 규칙이어야 한다.',
    ].filter(Boolean).join('\n')
    const prompt = ['--- 스레드 ---', input.threadText, '--- watchpup 출력 ---', input.output, '--- 끝 ---'].join('\n')
    const obj = await judge(deps, sys, prompt)
    const score = typeof obj?.score === 'number' ? Math.max(1, Math.min(5, Math.round(obj.score))) : 3
    const lesson = typeof obj?.lesson === 'string' && obj.lesson.trim() && obj.lesson.trim() !== 'null' ? obj.lesson.trim() : null
    return { score, lesson }
  } catch (err) {
    logger.warn('selfCritique 실패', { err: String(err) })
    return { score: 3, lesson: null }
  }
}

/** 사용자 피드백 증류: 자유서술 피드백 → 다음 실행에 주입할 일반 규칙 한 줄. */
export async function distillFeedback(
  deps: ReflectDeps,
  input: { threadText: string; output: string; feedback: string },
): Promise<string | null> {
  const fb = (input.feedback ?? '').trim()
  if (!fb) return null
  try {
    const sys = [
      '너는 사용자의 피드백을 비서 "watchpup"의 재사용 가능한 지침으로 바꾸는 편집자다.',
      '아래 JSON만 출력: {"lesson": "다음 실행부터 항상 적용할 구체적 지침 한 줄(한국어, 명령형). 유효한 지침을 못 만들면 null"}',
      '이번 건에만 국한된 사실 말고, 같은 워크플로우의 다음 실행에도 적용될 일반 규칙으로 만들어라.',
    ].join('\n')
    const prompt = [
      '--- 스레드 ---', input.threadText,
      '--- watchpup 출력 ---', input.output,
      '--- 사용자 피드백 ---', fb,
      '--- 끝 ---',
    ].join('\n')
    const obj = await judge(deps, sys, prompt)
    const lesson = typeof obj?.lesson === 'string' && obj.lesson.trim() && obj.lesson.trim() !== 'null' ? obj.lesson.trim() : null
    // 증류 실패 시 원문 피드백을 그대로 교훈으로(짧게)
    return lesson || (fb.length <= 120 ? fb : fb.slice(0, 119) + '…')
  } catch (err) {
    logger.warn('distillFeedback 실패', { err: String(err) })
    return fb.length <= 120 ? fb : fb.slice(0, 119) + '…'
  }
}
