import type { Skill, TeamSkill, UserSkill } from '../data/skills'

/**
 * 收藏 ID 可能指向示例库、个人技能或团队仓库技能，需从多列表解析。
 * 优先级：个人技能 > 团队技能 > 示例库（避免 id 碰撞时覆盖顺序明确）。
 */
export function resolveFavoriteSkills(
  favoriteIds: string[],
  catalogSkills: Skill[],
  mySkills: UserSkill[],
  teamSkills: TeamSkill[],
): Skill[] {
  return favoriteIds
    .map((id) => {
      const mine = mySkills.find((s) => s.id === id)
      if (mine) return mine as Skill
      const team = teamSkills.find((s) => s.id === id)
      if (team) return team as Skill
      return catalogSkills.find((s) => s.id === id)
    })
    .filter((s): s is Skill => s != null)
}
