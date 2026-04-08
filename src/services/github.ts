import type { SkillMeta, SkillBundle } from '../data/skills'
import {
  type GitProvider,
  type GitUser,
  type FileResult,
  type GitProviderType,
  getWebUrl,
  githubApiBaseForWebUrl,
  resolveGitHubApiBase,
} from './git-provider'

const REPO_NAME = 'cursor-skills'

const githubApiRoot = () => resolveGitHubApiBase()

export type { GitUser as GitHubUser }

/** GitHub Contents API 要求对路径中的 / 做百分号编码 */
function encodeContentsPath(path: string): string {
  return encodeURIComponent(path)
}

function coerceSkillMeta(m: SkillMeta, index: number): SkillMeta {
  const tags = Array.isArray(m.tags) ? m.tags : []
  const author =
    typeof m.author === 'string' && m.author.trim() !== '' ? m.author.trim() : ''
  let id: string
  if (typeof m.id === 'string' && m.id.trim() !== '') {
    id = m.id.trim()
  } else if (typeof m.name === 'string' && m.name.trim() !== '') {
    id = m.name.trim()
  } else {
    id = `skill-${index}`
  }
  return { ...m, id, tags, author }
}

/** 同索引内 id 重复时加后缀，避免 `${repoId}--${meta.id}` 与 React key 冲突 */
function dedupeMetaIds(metas: SkillMeta[]): SkillMeta[] {
  const seen = new Map<string, number>()
  return metas.map((m) => {
    let id = m.id
    const n = (seen.get(id) ?? 0) + 1
    seen.set(id, n)
    if (n > 1) return { ...m, id: `${id}__${n}` }
    return m
  })
}

/** 与 sync.pullFromProvider 一致，避免 index 为包装对象时解析错；补齐 id / tags，避免 UI key 与 .map 报错 */
export function normalizeSkillIndexData(raw: unknown): SkillMeta[] {
  let list: SkillMeta[] = []
  if (raw == null) return []
  if (Array.isArray(raw)) list = raw as SkillMeta[]
  else if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.skills)) list = o.skills as SkillMeta[]
    else if (Array.isArray(o.metas)) list = o.metas as SkillMeta[]
    else if (Array.isArray(o.items)) list = o.items as SkillMeta[]
    else if (Array.isArray(o.data)) list = o.data as SkillMeta[]
    else return []
  } else return []
  const coerced = list.map((m, i) => coerceSkillMeta(m, i))
  return dedupeMetaIds(coerced)
}

/** bundles.json 中 id 可能缺失，与团队页 `${repoId}--${bundle.id}` 组合前需补齐 */
export function normalizeSkillBundlesData(raw: unknown): SkillBundle[] {
  if (raw == null || !Array.isArray(raw)) return []
  const list = raw as SkillBundle[]
  const coerced = list.map((b, index) => {
    const skillNames = Array.isArray(b.skillNames) ? b.skillNames : []
    const author =
      typeof b.author === 'string' && b.author.trim() !== '' ? b.author.trim() : ''
    let id: string
    if (typeof b.id === 'string' && b.id.trim() !== '') {
      id = b.id.trim()
    } else if (typeof b.name === 'string' && b.name.trim() !== '') {
      id = b.name.trim()
    } else {
      id = `bundle-${index}`
    }
    return { ...b, id, skillNames, author }
  })
  const seen = new Map<string, number>()
  return coerced.map((b) => {
    let id = b.id
    const n = (seen.get(id) ?? 0) + 1
    seen.set(id, n)
    if (n > 1) return { ...b, id: `${id}__${n}` }
    return b
  })
}

function publicHeaders(): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function readPublicFile(owner: string, repo: string, path: string): Promise<FileResult | null> {
  const res = await fetch(`${githubApiRoot()}/repos/${owner}/${repo}/contents/${path}`, {
    headers: publicHeaders(),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`读取文件失败: ${path}`)
  const data = await res.json()
  return {
    content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))),
    sha: data.sha,
  }
}

export async function fetchTeamIndex(owner: string, repo: string, token?: string | null): Promise<SkillMeta[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${githubApiRoot()}/repos/${owner}/${repo}/contents/.skill-hub/index.json`, { headers })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`读取团队索引失败: ${owner}/${repo}`)
  const data = await res.json()
  const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))))
  return normalizeSkillIndexData(JSON.parse(content))
}

/**
 * bundles.json 为可选；若直接 GET 缺失文件，浏览器控制台会出现 404。
 * 先列目录，仅当存在 bundles.json 时再拉取内容。
 */
async function fetchTeamBundlesWithHeaders(
  apiRoot: string,
  owner: string,
  repo: string,
  headers: Record<string, string>,
): Promise<SkillBundle[]> {
  const base = `${apiRoot}/repos/${owner}/${repo}/contents`
  const dirRes = await fetch(`${base}/.skill-hub`, { headers })
  if (dirRes.status === 404) return []
  if (!dirRes.ok) throw new Error(`读取技能集合失败: ${owner}/${repo}`)
  const items = (await dirRes.json()) as { name?: string; type?: string }[]
  if (!Array.isArray(items)) return []
  if (!items.some((item) => item.type === 'file' && item.name === 'bundles.json')) return []

  const res = await fetch(`${base}/.skill-hub/bundles.json`, { headers })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`读取技能集合失败: ${owner}/${repo}`)
  const data = await res.json()
  const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))))
  return normalizeSkillBundlesData(JSON.parse(content))
}

export async function fetchTeamBundles(owner: string, repo: string, token?: string | null): Promise<SkillBundle[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetchTeamBundlesWithHeaders(githubApiRoot(), owner, repo, headers)
}

export async function fetchTeamSkillMd(owner: string, repo: string, skillName: string, token?: string | null): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const path = encodeContentsPath(`skills/${skillName}/SKILL.md`)
  const res = await fetch(`${githubApiRoot()}/repos/${owner}/${repo}/contents/${path}`, { headers })
  if (res.status === 404) return ''
  if (!res.ok) throw new Error(`读取技能文件失败: ${skillName}`)
  const data = await res.json()
  return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))))
}

export class GitHubService implements GitProvider {
  readonly providerType: GitProviderType = 'github'
  readonly apiUrl: string
  readonly webUrl: string
  token: string

  constructor(token: string, apiUrl?: string) {
    this.token = token
    const resolved = (apiUrl ?? resolveGitHubApiBase()).replace(/\/$/, '')
    this.apiUrl = resolved
    this.webUrl = getWebUrl('github', githubApiBaseForWebUrl(resolved))
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  }

  /**
   * 大文件等场景下 JSON 无 base64，API 会提供 raw 域名的 download_url。
   * raw.githubusercontent.com 在浏览器中无 CORS，故用同一 Contents 接口 + Accept raw 拉取正文。
   */
  private async fetchRawViaContentsApi(owner: string, repo: string, encodedPath: string, sha: string): Promise<FileResult> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/contents/${encodedPath}`, {
      headers: {
        ...this.headers(),
        Accept: 'application/vnd.github.raw',
      },
    })
    if (!res.ok) throw new Error(`读取文件失败: ${encodedPath}`)
    const text = await res.text()
    return { content: text.replace(/^\uFEFF/, ''), sha }
  }

  async getUser(): Promise<GitUser> {
    const res = await fetch(`${this.apiUrl}/user`, { headers: this.headers() })
    if (!res.ok) throw new Error('Token 无效或已过期')
    return res.json()
  }

  async ensureRepo(owner: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${REPO_NAME}`, { headers: this.headers() })
    if (res.ok) return
    if (res.status === 404) {
      const create = await fetch(`${this.apiUrl}/user/repos`, {
        method: 'POST',
        headers: { ...this.headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: REPO_NAME,
          description: 'Cursor Skills 管理仓库 - 由 Skill Hub 自动创建',
          private: false,
          auto_init: true,
        }),
      })
      if (!create.ok) throw new Error('创建仓库失败')
      await new Promise((r) => setTimeout(r, 1500))
      return
    }
    throw new Error('检查仓库失败')
  }

  async readFile(owner: string, path: string): Promise<FileResult | null> {
    const encodedPath = encodeContentsPath(path)
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${REPO_NAME}/contents/${encodedPath}`, {
      headers: this.headers(),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`读取文件失败: ${path}`)
    const data = (await res.json()) as {
      content?: string
      sha?: string
      encoding?: string
      download_url?: string | null
    }
    if (data.content != null && data.content !== '') {
      const raw = data.content.replace(/\n/g, '')
      return {
        content: decodeURIComponent(escape(atob(raw))),
        sha: data.sha || '',
      }
    }
    if (data.sha || data.download_url) {
      return this.fetchRawViaContentsApi(owner, REPO_NAME, encodedPath, data.sha || '')
    }
    return null
  }

  async writeFile(owner: string, path: string, content: string, _sha?: string, message?: string): Promise<string> {
    const encoded = btoa(unescape(encodeURIComponent(content)))
    const url = `${this.apiUrl}/repos/${owner}/${REPO_NAME}/contents/${encodeContentsPath(path)}`
    const headers = { ...this.headers(), 'Content-Type': 'application/json' }

    const attempt = async (fileSha?: string) => {
      const body: Record<string, string> = { message: message || `更新 ${path}`, content: encoded }
      if (fileSha) body.sha = fileSha
      const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { status: res.status, message: (err as { message?: string }).message || String(res.status) }
      }
      const data = (await res.json()) as { content?: { sha?: string } }
      return (data.content?.sha || '') as string
    }

    // 始终以远端当前 blob sha 为准（favorites / settings / index 等），忽略 localStorage 里可能过期的 sha，避免 409
    const cur = await this.readFile(owner, path)
    let trySha: string | undefined = cur?.sha
    if (!cur) {
      trySha = undefined
    }

    const maxAttempts = 6
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await attempt(trySha)
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string }
        const conflict = err.status === 409 || err.status === 422
        // 此前用 i < 2 导致第 3 次遇 409 无法再拉取最新 sha；冲突时持续拉取 sha 重试直至次数上限
        if (conflict && i < maxAttempts - 1) {
          const existing = await this.readFile(owner, path)
          if (existing?.sha && existing.sha !== trySha) {
            trySha = existing.sha
            continue
          }
        }
        throw new Error(`写入文件失败: ${path} - ${err.message || 'unknown'}`)
      }
    }
    throw new Error(`写入文件失败: ${path}`)
  }

  async deleteFile(owner: string, path: string, sha: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${REPO_NAME}/contents/${encodeContentsPath(path)}`, {
      method: 'DELETE',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `删除 ${path}`, sha }),
    })
    if (!res.ok && res.status !== 404) throw new Error(`删除文件失败: ${path}`)
  }

  async readIndex(owner: string): Promise<{ data: SkillMeta[]; sha: string } | null> {
    const result = await this.readFile(owner, '.skill-hub/index.json')
    if (!result) return null
    try {
      const raw = JSON.parse(result.content.replace(/^\uFEFF/, ''))
      const data = normalizeSkillIndexData(raw)
      return { data, sha: result.sha }
    } catch {
      return { data: [], sha: result.sha }
    }
  }

  async writeIndex(owner: string, data: SkillMeta[], sha?: string): Promise<string> {
    return this.writeFile(
      owner,
      '.skill-hub/index.json',
      JSON.stringify(data, null, 2),
      sha,
      '更新技能索引',
    )
  }

  async readFavorites(owner: string): Promise<{ data: string[]; sha: string } | null> {
    const result = await this.readFile(owner, '.skill-hub/favorites.json')
    if (!result) return null
    try {
      const data = JSON.parse(result.content.replace(/^\uFEFF/, '')) as string[]
      return { data, sha: result.sha }
    } catch {
      return { data: [], sha: result.sha }
    }
  }

  async writeFavorites(owner: string, data: string[], sha?: string): Promise<string> {
    return this.writeFile(
      owner,
      '.skill-hub/favorites.json',
      JSON.stringify(data, null, 2),
      sha,
      '更新收藏列表',
    )
  }

  async readRepoFile(owner: string, repo: string, path: string): Promise<FileResult | null> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/contents/${encodeContentsPath(path)}`, {
      headers: this.headers(),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`读取文件失败: ${path}`)
    const data = (await res.json()) as { content?: string; sha?: string; download_url?: string | null }
    if (data.content != null && data.content !== '') {
      return {
        content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))),
        sha: data.sha || '',
      }
    }
    const encodedPath = encodeContentsPath(path)
    if (data.sha || data.download_url) {
      return this.fetchRawViaContentsApi(owner, repo, encodedPath, data.sha || '')
    }
    return null
  }

  async readRepoIndex(owner: string, repo: string): Promise<{ data: SkillMeta[]; sha: string } | null> {
    const result = await this.readRepoFile(owner, repo, '.skill-hub/index.json')
    if (!result) return null
    return { data: normalizeSkillIndexData(JSON.parse(result.content)), sha: result.sha }
  }

  async readRepoBundles(owner: string, repo: string): Promise<SkillBundle[]> {
    return fetchTeamBundlesWithHeaders(this.apiUrl, owner, repo, this.headers())
  }

  async writeRepoFile(owner: string, repo: string, path: string, content: string, sha?: string, message?: string): Promise<string> {
    const body: Record<string, string> = {
      message: message || `更新 ${path}`,
      content: btoa(unescape(encodeURIComponent(content))),
    }
    if (sha) body.sha = sha
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`写入文件失败: ${path}`)
    const data = await res.json()
    return data.content.sha
  }

  async forkRepo(owner: string, repo: string): Promise<string> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/forks`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Fork 仓库失败')
    const data = await res.json()
    await new Promise((r) => setTimeout(r, 2000))
    return data.full_name
  }

  async createMergeRequest(
    owner: string, repo: string,
    title: string, body: string,
    head: string, base = 'main',
  ): Promise<string> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, head, base }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`创建 PR 失败: ${err.message || res.status}`)
    }
    const data = await res.json()
    return data.html_url
  }

  async listSkillFolderNames(owner: string): Promise<string[]> {
    const encodedPath = encodeContentsPath('skills')
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${REPO_NAME}/contents/${encodedPath}`, {
      headers: this.headers(),
    })
    if (res.status === 404) return []
    if (!res.ok) throw new Error('列出 skills 目录失败')
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data
      .filter((item: { type?: string }) => item.type === 'dir')
      .map((item: { name: string }) => item.name)
  }

  async readSettings(owner: string): Promise<{ data: Record<string, unknown>; sha: string } | null> {
    const result = await this.readFile(owner, '.skill-hub/settings.json')
    if (!result) return null
    try {
      return { data: JSON.parse(result.content.replace(/^\uFEFF/, '')), sha: result.sha }
    } catch {
      return null
    }
  }

  async writeSettings(owner: string, data: Record<string, unknown>, sha?: string): Promise<string> {
    return this.writeFile(
      owner,
      '.skill-hub/settings.json',
      JSON.stringify(data, null, 2),
      sha,
      '更新设置',
    )
  }
}
