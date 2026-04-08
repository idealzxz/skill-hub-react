import type { Skill, TeamSkill } from '../data/skills'
import { DEFAULT_WEB_URLS, type GitProviderType } from '../services/git-provider'

export type Platform = 'Windows' | 'macOS' | 'Linux'

type SkillInstallShape = Pick<Skill, 'id' | 'name' | 'author' | 'installCommand' | 'homepage'>

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

function parseSlugFromInstallCommand(installCommand?: string): string | null {
  if (!installCommand) return null
  const skillhubMatch = installCommand.match(/skillhub\s+install\s+([^\s]+)/i)
  if (skillhubMatch?.[1]) return skillhubMatch[1].trim()

  const gitMatch = installCommand.match(/github\.com[/:]([^/]+)\/([^/.]+)\.git/i)
  if (gitMatch?.[2]) return gitMatch[2].trim()

  return null
}

function parseSlugFromHomepage(homepage?: string): string | null {
  if (!homepage) return null
  try {
    const pathname = new URL(homepage).pathname
    const segment = pathname.split('/').filter(Boolean).at(-1)
    return segment || null
  } catch {
    return null
  }
}

export function resolveSkillSlug(skill: SkillInstallShape): string {
  const fromInstallCommand = parseSlugFromInstallCommand(skill.installCommand)
  if (fromInstallCommand) return fromInstallCommand

  const fromHomepage = parseSlugFromHomepage(skill.homepage)
  if (fromHomepage) return fromHomepage

  if (/^skill-\d+$/i.test(skill.id)) {
    return normalizeSlug(skill.name)
  }

  return normalizeSlug(skill.id || skill.name)
}

/** 从团队技能等已生成的 installCommand 中取出 git clone 的 HTTPS 地址（作者≠仓库 owner 时不能用 author 拼 URL） */
function parseGitCloneHttpsFromInstallCommand(installCommand?: string): string | null {
  if (!installCommand) return null
  const m = installCommand.match(/\bgit\s+clone\s+(https:\/\/[^\s]+\.git)/i)
  return m?.[1] ?? null
}

function buildGitHttpsRemote(skill: SkillInstallShape): string {
  const fromClone = parseGitCloneHttpsFromInstallCommand(skill.installCommand)
  if (fromClone) return fromClone

  const repoOwner = (skill as Skill & { repoOwner?: string }).repoOwner?.trim()
  const repoName = (skill as Skill & { repoName?: string }).repoName?.trim()
  const repoPlatform = (skill as Skill & { repoPlatform?: GitProviderType }).repoPlatform
  if (repoOwner && repoName) {
    const platform = repoPlatform ?? 'github'
    const base = DEFAULT_WEB_URLS[platform].replace(/\/$/, '')
    return `${base}/${repoOwner}/${repoName}.git`
  }

  const slug = resolveSkillSlug(skill)
  const owner = (skill.author && String(skill.author).trim()) || 'unknown'
  return `https://github.com/${owner}/${slug}.git`
}

function resolveSkillFolderName(skill: SkillInstallShape): string {
  return skill.name?.trim() || resolveSkillSlug(skill)
}

export function buildSingleInstallCommand(skill: SkillInstallShape, platform: Platform): string {
  const remote = buildGitHttpsRemote(skill)
  if (platform === 'Windows') {
    return `if not exist "%USERPROFILE%\\.cursor\\skills" mkdir "%USERPROFILE%\\.cursor\\skills" && git clone ${remote} "%USERPROFILE%\\.cursor\\skills\\${resolveSkillFolderName(skill)}"`
  }
  return `mkdir -p ~/.cursor/skills && git clone ${remote} ~/.cursor/skills/${resolveSkillFolderName(skill)}`
}

/** 团队技能：克隆团队仓库并拷贝 skills/&lt;name&gt;，与团队页同步逻辑一致 */
export function buildTeamSkillInstallCommand(skill: TeamSkill): string {
  const owner = skill.repoOwner?.trim()
  const repo = skill.repoName?.trim()
  const name = skill.name?.trim() || 'skill'
  if (!owner || !repo) {
    const fallback = skill.installCommand?.trim()
    if (fallback) return fallback
    return buildSingleInstallCommand(skill, 'macOS')
  }
  const platform = skill.repoPlatform ?? 'github'
  const webUrl = DEFAULT_WEB_URLS[platform].replace(/\/$/, '')
  return `mkdir -p ~/.cursor/skills ~/.cursor/skills-team && git clone ${webUrl}/${owner}/${repo}.git ~/.cursor/skills-team/${repo} && cp -r ~/.cursor/skills-team/${repo}/skills/${name} ~/.cursor/skills/${name}`
}

export function buildBatchInstallCommand(skills: SkillInstallShape[], platform: Platform): string {
  if (skills.length === 0) return ''

  const isWin = platform === 'Windows'
  const joiner = isWin ? ' && ' : ' && \\\n'

  const prefix = isWin
    ? 'if not exist "%USERPROFILE%\\.cursor\\skills" mkdir "%USERPROFILE%\\.cursor\\skills" && cd /d "%USERPROFILE%\\.cursor\\skills"'
    : 'mkdir -p ~/.cursor/skills && cd ~/.cursor/skills'
  const cloneCommands = skills.map((skill) => `git clone ${buildGitHttpsRemote(skill)} ${resolveSkillFolderName(skill)}`)
  return [prefix, ...cloneCommands].join(joiner)
}
