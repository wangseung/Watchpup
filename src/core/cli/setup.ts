import { createInterface } from 'node:readline/promises'
import { keychain, SecretKeys } from '../secrets/keychain.js'
import { ConfigStore } from '../config/store.js'

// 빈 입력(엔터)은 기존 값을 유지한다 — 하나만 바꿀 때 재실행하기 편하도록.
const rl = createInterface({ input: process.stdin, output: process.stdout })
const configStore = new ConfigStore()
const current = configStore.get()

const bot = (await rl.question('SLACK_BOT_TOKEN (xoxb-...) [엔터=유지]: ')).trim()
const appt = (await rl.question('SLACK_APP_TOKEN (xapp-...) [엔터=유지]: ')).trim()
const myId = (await rl.question(`mySlackUserId (U... 내 멤버 ID) [엔터=유지: ${current.mySlackUserId || '없음'}]: `)).trim()
rl.close()

const saved: string[] = []
if (bot) { await keychain.set(SecretKeys.slackBotToken, bot); saved.push('SLACK_BOT_TOKEN(Keychain)') }
if (appt) { await keychain.set(SecretKeys.slackAppToken, appt); saved.push('SLACK_APP_TOKEN(Keychain)') }
if (myId) { configStore.update({ mySlackUserId: myId }); saved.push(`mySlackUserId(${configStore.path})`) }

console.log(saved.length ? `저장 완료: ${saved.join(', ')}` : '변경 없음 (전부 유지)')
console.log('앱을 재시작하면 반영됩니다.')
