import type { Skill, TeamSkill } from './data/skills'

export { formatProviderError } from './utils/providerErrors'
export { resolveFavoriteSkills } from './utils/favoriteSkills'

/** 卡片/详情副标题：有作者则 @作者；团队技能无作者时用仓库展示名；收藏页可传入 captionOverride */
export function skillSubtitleLine(skill: Skill, captionOverride?: string): string {
  if (captionOverride != null && captionOverride !== '') return captionOverride
  const a = skill.author?.trim()
  if (a) return `@${a}`
  if ('repoId' in skill) {
    const rl = (skill as TeamSkill).repoLabel?.trim()
    if (rl) return rl
  }
  return '@未知'
}

export function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return n.toString()
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
