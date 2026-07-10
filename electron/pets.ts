/**
 * 펫 에셋 해석(브리지 레이어의 파일시스템 부분).
 * 커스텀 이미지 폴더 → 상태별 file:// 맵, Codex Pet 팩(pet.json + 스프라이트시트) 목록/해석.
 * electron `app` 의존을 피하려 userDataDir은 인자로 받는다.
 */
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const PET_STATES = ['idle', 'thinking', 'ready', 'chatting']
const PET_IMG_EXT = ['gif', 'png', 'apng', 'webp', 'jpg', 'jpeg']

/** 폴더에서 상태별 파일(idle/thinking/ready/chatting.*) 해석 → file:// 맵 */
export function petImagesFromDir(dir: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!dir) return out
  for (const st of PET_STATES) {
    for (const ext of PET_IMG_EXT) {
      const p = join(dir, `${st}.${ext}`)
      if (existsSync(p)) {
        out[st] = 'file://' + p
        break
      }
    }
  }
  return out
}

function codexHome(): string {
  return process.env.CODEX_HOME || join(homedir(), '.codex')
}

// Codex Pet 팩: <base>/pets/<id>/{pet.json, spritesheet.webp|png}. 스프라이트시트는 1536x1872 고정.
/** 설치된 Codex 펫 목록(미리보기용 spritesheet file:// 포함). userDataDir(앱 복사본) 우선. */
export function listCodexPets(userDataDir: string): Array<{ id: string; displayName: string; dir: string; spritesheet: string | null }> {
  const out: Array<{ id: string; displayName: string; dir: string; spritesheet: string | null }> = []
  const seen = new Set<string>()
  const bases = [join(userDataDir, 'pets'), join(codexHome(), 'pets')]
  for (const base of bases) {
    let names: string[] = []
    try {
      names = readdirSync(base)
    } catch {
      continue
    }
    for (const name of names) {
      const dir = join(base, name)
      try {
        if (!statSync(dir).isDirectory()) continue
        const petJsonPath = join(dir, 'pet.json')
        if (!existsSync(petJsonPath)) continue
        const raw = JSON.parse(readFileSync(petJsonPath, 'utf8'))
        const id = typeof raw?.id === 'string' && raw.id ? raw.id : name
        if (seen.has(id)) continue
        seen.add(id)
        const displayName = typeof raw?.displayName === 'string' && raw.displayName ? raw.displayName : id
        out.push({ id, displayName, dir, spritesheet: resolveCodexPet(dir)?.spritesheet ?? null })
      } catch {
        // 이 항목만 건너뜀(pet.json 파싱 실패 등)
      }
    }
  }
  return out
}

/** 특정 Codex 펫 폴더 → { spritesheet(file://), displayName }. 실패 시 null. */
export function resolveCodexPet(dir: string): { spritesheet: string; displayName: string } | null {
  if (!dir) return null
  try {
    const petJsonPath = join(dir, 'pet.json')
    if (!existsSync(petJsonPath)) return null
    const raw = JSON.parse(readFileSync(petJsonPath, 'utf8'))
    const spritesheetPath = typeof raw?.spritesheetPath === 'string' && raw.spritesheetPath ? raw.spritesheetPath : 'spritesheet.webp'
    let file = join(dir, spritesheetPath)
    if (!existsSync(file)) {
      const fallback = join(dir, 'spritesheet.png')
      if (!existsSync(fallback)) return null
      file = fallback
    }
    const displayName = typeof raw?.displayName === 'string' && raw.displayName ? raw.displayName : (typeof raw?.id === 'string' && raw.id ? raw.id : dir)
    return { spritesheet: 'file://' + file, displayName }
  } catch {
    return null
  }
}
