import { GitHubService, type GitHubUser } from './github'
import type { GitProvider } from './git-provider'
import type { GitUser } from './git-provider'
import type { UserSkill, SkillMeta } from '../data/skills'
import { pickColor } from '../data/skills'

export interface SyncResult {
  mySkills: UserSkill[]
  favorites: string[]
  indexSha?: string
  favSha?: string
  settingsSha?: string
}

export async function pullFromGitHub(
  gh: GitHubService,
  user: GitHubUser,
): Promise<SyncResult> {
  await gh.ensureRepo(user.login)

  const [indexRes, favRes] = await Promise.all([
    gh.readIndex(user.login),
    gh.readFavorites(user.login),
  ])

  const metas: SkillMeta[] = indexRes?.data || []
  const favorites: string[] = favRes?.data || []

  const skills: UserSkill[] = []
  for (const meta of metas) {
    const path = `skills/${meta.name}/SKILL.md`
    const file = await gh.readFile(user.login, path)
    skills.push({
      id: meta.id,
      name: meta.name,
      author: meta.author,
      description: meta.description,
      category: meta.category,
      tags: meta.tags,
      stars: 0,
      downloads: 0,
      version: meta.version,
      color: meta.color,
      installCommand: `git clone https://github.com/${user.login}/cursor-skills.git ~/.cursor/skills && cd ~/.cursor/skills/skills/${meta.name}`,
      updatedAt: meta.updatedAt,
      isOwned: true,
      skillMdContent: file?.content || '',
      repoPath: path,
      sha: file?.sha,
      lastSynced: new Date().toISOString(),
      syncStatus: 'synced',
    })
  }

  return {
    mySkills: skills,
    favorites,
    indexSha: indexRes?.sha,
    favSha: favRes?.sha,
  }
}

export async function pullFromProvider(
  provider: GitProvider,
  user: GitUser,
): Promise<SyncResult> {
  await provider.ensureRepo(user.login)

  const [indexRes, favRes] = await Promise.all([
    provider.readIndex(user.login),
    provider.readFavorites(user.login),
  ])

  const metas: SkillMeta[] = indexRes?.data || []
  const favorites: string[] = favRes?.data || []

  const skills: UserSkill[] = []
  for (const meta of metas) {
    const path = `skills/${meta.name}/SKILL.md`
    const file = await provider.readFile(user.login, path)
    skills.push({
      id: meta.id,
      name: meta.name,
      author: meta.author,
      description: meta.description,
      category: meta.category,
      tags: meta.tags,
      stars: 0,
      downloads: 0,
      version: meta.version,
      color: meta.color,
      installCommand: `git clone ${provider.webUrl}/${user.login}/cursor-skills.git ~/.cursor/skills/${user.login}-cursor-skills`,
      updatedAt: meta.updatedAt,
      isOwned: true,
      skillMdContent: file?.content || '',
      repoPath: path,
      sha: file?.sha,
      lastSynced: new Date().toISOString(),
      syncStatus: 'synced',
    })
  }

  return {
    mySkills: skills,
    favorites,
    indexSha: indexRes?.sha,
    favSha: favRes?.sha,
  }
}

export async function pushSkill(
  gh: GitHubService,
  user: GitHubUser,
  skill: UserSkill,
  allMetas: SkillMeta[],
  indexSha?: string,
): Promise<{ fileSha: string; newIndexSha: string }> {
  const path = `skills/${skill.name}/SKILL.md`
  const fileSha = await gh.writeFile(
    user.login,
    path,
    skill.skillMdContent,
    skill.sha,
    `${skill.sha ? '更新' : '新建'}技能: ${skill.name}`,
  )

  const meta: SkillMeta = {
    id: skill.id,
    name: skill.name,
    author: skill.author,
    description: skill.description,
    category: skill.category,
    tags: skill.tags,
    version: skill.version,
    color: skill.color,
    createdAt: skill.updatedAt,
    updatedAt: new Date().toISOString(),
  }

  const idx = allMetas.findIndex((m) => m.id === skill.id)
  if (idx >= 0) allMetas[idx] = meta
  else allMetas.push(meta)

  const newIndexSha = await gh.writeIndex(user.login, allMetas, indexSha)
  return { fileSha, newIndexSha }
}

export async function deleteSkillRemote(
  gh: GitHubService,
  user: GitHubUser,
  skill: UserSkill,
  allMetas: SkillMeta[],
  indexSha?: string,
): Promise<string> {
  if (skill.sha) {
    await gh.deleteFile(user.login, `skills/${skill.name}/SKILL.md`, skill.sha)
  }
  const filtered = allMetas.filter((m) => m.id !== skill.id)
  return gh.writeIndex(user.login, filtered, indexSha)
}

export async function pushFavorites(
  gh: GitHubService,
  user: GitHubUser,
  favorites: string[],
  sha?: string,
): Promise<string> {
  return gh.writeFavorites(user.login, favorites, sha)
}

export function createNewSkill(author: string, index: number): UserSkill {
  const now = new Date().toISOString()
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    name: '',
    author,
    description: '',
    category: 'AI & ML',
    tags: [],
    stars: 0,
    downloads: 0,
    version: '1.0.0',
    color: pickColor(index),
    installCommand: '',
    updatedAt: now,
    isOwned: true,
    skillMdContent: `# 新技能\n\n在这里编写技能的详细说明...\n`,
    repoPath: '',
    syncStatus: 'local',
  }
}
