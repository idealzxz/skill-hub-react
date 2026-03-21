import type { SkillMeta, SkillBundle } from '../data/skills'

const API = 'https://api.github.com'
const REPO_NAME = 'cursor-skills'

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

interface FileResult {
  content: string
  sha: string
}

function publicHeaders(): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function readPublicFile(owner: string, repo: string, path: string): Promise<FileResult | null> {
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
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
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/.skill-hub/index.json`, { headers })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`读取团队索引失败: ${owner}/${repo}`)
  const data = await res.json()
  const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))))
  return JSON.parse(content) as SkillMeta[]
}

export async function fetchTeamBundles(owner: string, repo: string, token?: string | null): Promise<SkillBundle[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/.skill-hub/bundles.json`, { headers })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`读取技能集合失败: ${owner}/${repo}`)
  const data = await res.json()
  const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))))
  return JSON.parse(content) as SkillBundle[]
}

export async function fetchTeamSkillMd(owner: string, repo: string, skillName: string, token?: string | null): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/skills/${skillName}/SKILL.md`, { headers })
  if (res.status === 404) return ''
  if (!res.ok) throw new Error(`读取技能文件失败: ${skillName}`)
  const data = await res.json()
  return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))))
}

export class GitHubService {
  token: string

  constructor(token: string) {
    this.token = token
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  }

  async getUser(): Promise<GitHubUser> {
    const res = await fetch(`${API}/user`, { headers: this.headers() })
    if (!res.ok) throw new Error('Token 无效或已过期')
    return res.json()
  }

  async ensureRepo(owner: string): Promise<void> {
    const res = await fetch(`${API}/repos/${owner}/${REPO_NAME}`, { headers: this.headers() })
    if (res.ok) return
    if (res.status === 404) {
      const create = await fetch(`${API}/user/repos`, {
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
    const res = await fetch(`${API}/repos/${owner}/${REPO_NAME}/contents/${path}`, {
      headers: this.headers(),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`读取文件失败: ${path}`)
    const data = await res.json()
    return {
      content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))),
      sha: data.sha,
    }
  }

  async writeFile(owner: string, path: string, content: string, sha?: string, message?: string): Promise<string> {
    const body: Record<string, string> = {
      message: message || `更新 ${path}`,
      content: btoa(unescape(encodeURIComponent(content))),
    }
    if (sha) body.sha = sha
    const res = await fetch(`${API}/repos/${owner}/${REPO_NAME}/contents/${path}`, {
      method: 'PUT',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`写入文件失败: ${path} - ${err.message || res.status}`)
    }
    const data = await res.json()
    return data.content.sha
  }

  async deleteFile(owner: string, path: string, sha: string): Promise<void> {
    const res = await fetch(`${API}/repos/${owner}/${REPO_NAME}/contents/${path}`, {
      method: 'DELETE',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `删除 ${path}`, sha }),
    })
    if (!res.ok && res.status !== 404) throw new Error(`删除文件失败: ${path}`)
  }

  async readIndex(owner: string): Promise<{ data: SkillMeta[]; sha: string } | null> {
    const result = await this.readFile(owner, '.skill-hub/index.json')
    if (!result) return null
    return { data: JSON.parse(result.content), sha: result.sha }
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
    return { data: JSON.parse(result.content), sha: result.sha }
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

  async readSettings(owner: string): Promise<{ data: Record<string, unknown>; sha: string } | null> {
    const result = await this.readFile(owner, '.skill-hub/settings.json')
    if (!result) return null
    return { data: JSON.parse(result.content), sha: result.sha }
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
