import { GitHubService, type GitHubUser, normalizeSkillIndexData } from './github'
import type { GitProvider } from './git-provider'
import type { GitUser } from './git-provider'
import type { UserSkill, SkillMeta, TeamRepo } from '../data/skills'
import { pickColor } from '../data/skills'

export interface SyncedSettings {
  theme: 'light' | 'dark' | 'system'
  teamRepos: TeamRepo[]
}

export interface SyncResult {
  mySkills: UserSkill[]
  favorites: string[]
  settings?: SyncedSettings
  indexSha?: string
  favSha?: string
  settingsSha?: string
}

function normalizeFavoritesData(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.favorites)) return o.favorites as string[]
    if (Array.isArray(o.ids)) return o.ids as string[]
  }
  return []
}

function descriptionFromSkillMd(content: string): string {
  const title = content.match(/^#\s+(.+)/m)?.[1]?.trim()
  const rest = content.replace(/^#.*\n+/, '').trim()
  const s = title || rest.slice(0, 200) || ''
  return s.slice(0, 500)
}

/** index.json 为 [] 时，按仓库内 skills/ 子目录名生成元数据 */
function buildDiscoveredMeta(name: string, userLogin: string, index: number): SkillMeta {
  const now = new Date().toISOString()
  return {
    id: `discovered-${name}`,
    name,
    author: userLogin,
    description: '',
    category: 'AI & ML',
    tags: [],
    version: '1.0.0',
    color: pickColor(index),
    createdAt: now,
    updatedAt: now,
  }
}

function isSkillBodyEmpty(skill: UserSkill): boolean {
  return !skill.skillMdContent?.trim()
}

/**
 * 拉取远程后合并本地：保留仍为「仅本地 / 已修改」且与远程 id、技能名不冲突的条目，
 * 避免远程 index 为空或暂未发现目录时，把刚新建未推成功的技能整表覆盖掉。
 *
 * 同名时：若远程正文为空（未上传、读失败、占位）而本地导入/编辑过有正文，合并进远程那条（保留远程 id/sha 便于推送），
 * 避免导入后同步只剩空文档。
 */
export function mergeRemoteMySkills(local: UserSkill[], remote: UserSkill[]): UserSkill[] {
  const remoteIds = new Set(remote.map((s) => s.id))
  const mergedLocalIds = new Set<string>()

  const mergedRemote = remote.map((r) => {
    const l = local.find(
      (x) =>
        x.name === r.name &&
        (x.syncStatus === 'local' || x.syncStatus === 'modified'),
    )
    if (!l) return r

    const remoteEmpty = isSkillBodyEmpty(r)
    const localHas = !isSkillBodyEmpty(l)

    if (localHas && remoteEmpty) {
      mergedLocalIds.add(l.id)
      return {
        ...r,
        skillMdContent: l.skillMdContent,
        description: l.description?.trim() ? l.description : r.description,
        category: l.category,
        tags: l.tags?.length ? l.tags : r.tags,
        version: l.version,
        color: l.color,
        author: l.author,
        updatedAt: l.updatedAt,
        syncStatus: 'local' as const,
      }
    }

    if (l.syncStatus === 'modified' && localHas) {
      mergedLocalIds.add(l.id)
      return {
        ...r,
        skillMdContent: l.skillMdContent,
        description: l.description,
        category: l.category,
        tags: l.tags,
        version: l.version,
        color: l.color,
        syncStatus: 'modified' as const,
        sha: l.sha ?? r.sha,
      }
    }

    return r
  })

  const remoteNames = new Set(mergedRemote.map((s) => s.name))
  const pending = local.filter((s) => {
    if (s.syncStatus !== 'local' && s.syncStatus !== 'modified') return false
    if (remoteIds.has(s.id)) return false
    if (mergedLocalIds.has(s.id)) return false
    if (remoteNames.has(s.name)) return false
    return true
  })

  return [...mergedRemote, ...pending]
}

export async function pullFromGitHub(
  gh: GitHubService,
  user: GitHubUser,
): Promise<SyncResult> {
  return pullFromProvider(gh, user)
}

export async function pullFromProvider(
  provider: GitProvider,
  user: GitUser,
): Promise<SyncResult> {
  await provider.ensureRepo(user.login)

  // 任一项读取失败（如 settings.json 损坏）不应拖垮整次拉取，否则顶部「同步」会失败而「保存并同步」仍可用
  const [idxSettled, favSettled, settingsSettled] = await Promise.allSettled([
    provider.readIndex(user.login),
    provider.readFavorites(user.login),
    provider.readSettings(user.login),
  ])
  const indexRes = idxSettled.status === 'fulfilled' ? idxSettled.value : null
  const favRes = favSettled.status === 'fulfilled' ? favSettled.value : null
  const settingsRes = settingsSettled.status === 'fulfilled' ? settingsSettled.value : null

  let metas = normalizeSkillIndexData(indexRes?.data)
  if (metas.length === 0) {
    try {
      const names = await provider.listSkillFolderNames(user.login)
      metas = names.map((name, i) => buildDiscoveredMeta(name, user.login, i))
    } catch {
      metas = []
    }
  }

  const favorites = normalizeFavoritesData(favRes?.data)
  const settings = settingsRes?.data as SyncedSettings | undefined

  const skills: UserSkill[] = []
  for (let i = 0; i < metas.length; i++) {
    const meta = metas[i]
    const path = `skills/${meta.name}/SKILL.md`
    let file: Awaited<ReturnType<GitProvider['readFile']>> = null
    try {
      file = await provider.readFile(user.login, path)
    } catch {
      file = null
    }
    let description = meta.description
    if (file?.content && !description.trim()) {
      description = descriptionFromSkillMd(file.content)
    }
    skills.push({
      id: meta.id,
      name: meta.name,
      author: meta.author,
      description,
      category: meta.category,
      tags: meta.tags,
      stars: 0,
      downloads: 0,
      version: meta.version,
      color: meta.color || pickColor(i),
      installCommand: `mkdir -p ~/.cursor/skills && git clone ${provider.webUrl}/${user.login}/cursor-skills.git ~/.cursor/skills-sync && cp -r ~/.cursor/skills-sync/skills/${meta.name} ~/.cursor/skills/${meta.name}`,
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
    settings,
    indexSha: indexRes?.sha,
    favSha: favRes?.sha,
    settingsSha: settingsRes?.sha,
  }
}

function userSkillsToMetas(skills: UserSkill[]): SkillMeta[] {
  return skills.map((s) => ({
    id: s.id,
    name: s.name,
    author: s.author,
    description: s.description,
    category: s.category,
    tags: s.tags,
    version: s.version,
    color: s.color,
    createdAt: s.updatedAt,
    updatedAt: s.updatedAt,
  }))
}

export interface BatchPushPendingResult {
  skills: UserSkill[]
  newIndexSha: string | undefined
  error?: unknown
  failedSkillName?: string
}

/**
 * 与技能编辑页「保存并同步」相同：对每条待同步技能依次调用 pushSkillToProvider（共用 index 版本链）。
 * 某条失败时返回已成功条目的 skills 与 error，便于部分落地。
 */
export async function batchPushPendingSkillsToProvider(
  provider: GitProvider,
  user: GitUser,
  skills: UserSkill[],
  indexSha: string | undefined,
  onProgress?: (current: number, total: number, name: string) => void,
): Promise<BatchPushPendingResult> {
  const pending = skills.filter(
    (s) => (s.syncStatus === 'local' || s.syncStatus === 'modified') && s.name.trim(),
  )
  if (pending.length === 0) {
    return { skills, newIndexSha: indexSha }
  }

  const metas = userSkillsToMetas(skills)
  let currentIndexSha = indexSha
  const next = skills.map((s) => ({ ...s }))
  const now = new Date().toISOString()

  for (let i = 0; i < pending.length; i++) {
    const skill = pending[i]
    onProgress?.(i + 1, pending.length, skill.name)
    const idx = next.findIndex((x) => x.id === skill.id)
    if (idx < 0) continue
    const base = next[idx]
    const skillForPush: UserSkill = {
      ...base,
      installCommand: `mkdir -p ~/.cursor/skills && git clone ${provider.webUrl}/${user.login}/cursor-skills.git ~/.cursor/skills-sync && cp -r ~/.cursor/skills-sync/skills/${base.name} ~/.cursor/skills/${base.name}`,
      repoPath: `skills/${base.name}/SKILL.md`,
    }
    try {
      const { fileSha, newIndexSha } = await pushSkillToProvider(provider, user, skillForPush, metas, currentIndexSha)
      currentIndexSha = newIndexSha
      next[idx] = {
        ...next[idx],
        ...skillForPush,
        sha: fileSha,
        syncStatus: 'synced',
        lastSynced: now,
      }
    } catch (err) {
      return { skills: next, newIndexSha: currentIndexSha, error: err, failedSkillName: skill.name }
    }
  }

  return { skills: next, newIndexSha: currentIndexSha }
}

export async function pushSkillToProvider(
  provider: GitProvider,
  user: GitUser,
  skill: UserSkill,
  allMetas: SkillMeta[],
  indexSha?: string,
): Promise<{ fileSha: string; newIndexSha: string }> {
  const path = `skills/${skill.name}/SKILL.md`
  const fileSha = await provider.writeFile(
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

  const newIndexSha = await provider.writeIndex(user.login, allMetas, indexSha)
  return { fileSha, newIndexSha }
}

export async function pushSkill(
  gh: GitHubService,
  user: GitHubUser,
  skill: UserSkill,
  allMetas: SkillMeta[],
  indexSha?: string,
): Promise<{ fileSha: string; newIndexSha: string }> {
  return pushSkillToProvider(gh, user, skill, allMetas, indexSha)
}

export async function deleteSkillFromProvider(
  provider: GitProvider,
  user: GitUser,
  skill: UserSkill,
  allMetas: SkillMeta[],
  indexSha?: string,
): Promise<string> {
  if (skill.sha) {
    await provider.deleteFile(user.login, `skills/${skill.name}/SKILL.md`, skill.sha)
  }
  const filtered = allMetas.filter((m) => m.id !== skill.id)
  return provider.writeIndex(user.login, filtered, indexSha)
}

export async function deleteSkillRemote(
  gh: GitHubService,
  user: GitHubUser,
  skill: UserSkill,
  allMetas: SkillMeta[],
  indexSha?: string,
): Promise<string> {
  return deleteSkillFromProvider(gh, user, skill, allMetas, indexSha)
}

export async function pushFavorites(
  gh: GitHubService,
  user: GitHubUser,
  favorites: string[],
  sha?: string,
): Promise<string> {
  return gh.writeFavorites(user.login, favorites, sha)
}

export async function pushFavoritesToProvider(
  provider: GitProvider,
  user: GitUser,
  favorites: string[],
  sha?: string,
): Promise<string> {
  await provider.ensureRepo(user.login)
  return provider.writeFavorites(user.login, favorites, sha)
}

export async function pushSettingsToProvider(
  provider: GitProvider,
  user: GitUser,
  settings: SyncedSettings,
  sha?: string,
): Promise<string> {
  await provider.ensureRepo(user.login)
  return provider.writeSettings(user.login, settings as unknown as Record<string, unknown>, sha)
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
