import type { SkillMeta, SkillBundle } from '../data/skills'
import { type GitProvider, type GitUser, type FileResult, type GitProviderType, DEFAULT_API_URLS, getWebUrl } from './git-provider'

const REPO_NAME = 'cursor-skills'

export class GiteeService implements GitProvider {
  readonly providerType: GitProviderType = 'gitee'
  readonly apiUrl: string
  readonly webUrl: string
  private token: string

  constructor(token: string, apiUrl?: string) {
    this.token = token
    this.apiUrl = (apiUrl || DEFAULT_API_URLS.gitee).replace(/\/$/, '')
    this.webUrl = getWebUrl('gitee', this.apiUrl)
  }

  private authParam() {
    return `access_token=${this.token}`
  }

  private jsonHeaders() {
    return { 'Content-Type': 'application/json' }
  }

  async getUser(): Promise<GitUser> {
    const res = await fetch(`${this.apiUrl}/user?${this.authParam()}`)
    if (!res.ok) throw new Error('Token 无效或已过期')
    const data = await res.json()
    return { login: data.login, avatar_url: data.avatar_url, name: data.name }
  }

  async ensureRepo(owner: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${REPO_NAME}?${this.authParam()}`)
    if (res.ok) return
    if (res.status === 404) {
      const create = await fetch(`${this.apiUrl}/user/repos`, {
        method: 'POST',
        headers: this.jsonHeaders(),
        body: JSON.stringify({
          access_token: this.token,
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
    return this._readFile(owner, REPO_NAME, path)
  }

  async writeFile(owner: string, path: string, content: string, sha?: string, message?: string): Promise<string> {
    return this._writeFile(owner, REPO_NAME, path, content, sha, message)
  }

  async deleteFile(owner: string, path: string, sha: string): Promise<void> {
    const url = `${this.apiUrl}/repos/${owner}/${REPO_NAME}/contents/${path}`
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.jsonHeaders(),
      body: JSON.stringify({
        access_token: this.token,
        message: `删除 ${path}`,
        sha,
      }),
    })
    if (!res.ok && res.status !== 404) throw new Error(`删除文件失败: ${path}`)
  }

  async readIndex(owner: string): Promise<{ data: SkillMeta[]; sha: string } | null> {
    const result = await this.readFile(owner, '.skill-hub/index.json')
    if (!result) return null
    return { data: JSON.parse(result.content), sha: result.sha }
  }

  async writeIndex(owner: string, data: SkillMeta[], sha?: string): Promise<string> {
    return this.writeFile(owner, '.skill-hub/index.json', JSON.stringify(data, null, 2), sha, '更新技能索引')
  }

  async readFavorites(owner: string): Promise<{ data: string[]; sha: string } | null> {
    const result = await this.readFile(owner, '.skill-hub/favorites.json')
    if (!result) return null
    return { data: JSON.parse(result.content), sha: result.sha }
  }

  async writeFavorites(owner: string, data: string[], sha?: string): Promise<string> {
    return this.writeFile(owner, '.skill-hub/favorites.json', JSON.stringify(data, null, 2), sha, '更新收藏列表')
  }

  async readRepoFile(owner: string, repo: string, path: string): Promise<FileResult | null> {
    return this._readFile(owner, repo, path)
  }

  async readRepoIndex(owner: string, repo: string): Promise<{ data: SkillMeta[]; sha: string } | null> {
    const result = await this.readRepoFile(owner, repo, '.skill-hub/index.json')
    if (!result) return null
    return { data: JSON.parse(result.content), sha: result.sha }
  }

  async readRepoBundles(owner: string, repo: string): Promise<SkillBundle[]> {
    const result = await this.readRepoFile(owner, repo, '.skill-hub/bundles.json')
    if (!result) return []
    return JSON.parse(result.content)
  }

  async writeRepoFile(owner: string, repo: string, path: string, content: string, sha?: string, message?: string): Promise<string> {
    return this._writeFile(owner, repo, path, content, sha, message)
  }

  async forkRepo(owner: string, repo: string): Promise<string> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/forks`, {
      method: 'POST',
      headers: this.jsonHeaders(),
      body: JSON.stringify({ access_token: this.token }),
    })
    if (!res.ok) throw new Error('Fork 仓库失败')
    const data = await res.json()
    await new Promise((r) => setTimeout(r, 2000))
    return data.full_name
  }

  async createMergeRequest(
    owner: string, repo: string,
    title: string, body: string,
    head: string, base = 'master',
  ): Promise<string> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: this.jsonHeaders(),
      body: JSON.stringify({
        access_token: this.token,
        title,
        body,
        head,
        base,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`创建 PR 失败: ${err.message || res.status}`)
    }
    const data = await res.json()
    return data.html_url
  }

  private async _readFile(owner: string, repo: string, path: string): Promise<FileResult | null> {
    const url = `${this.apiUrl}/repos/${owner}/${repo}/contents/${path}?${this.authParam()}`
    const res = await fetch(url)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`读取文件失败: ${path}`)
    const data = await res.json()
    return {
      content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))),
      sha: data.sha,
    }
  }

  private async _writeFile(
    owner: string, repo: string, path: string,
    content: string, sha?: string, message?: string,
  ): Promise<string> {
    const url = `${this.apiUrl}/repos/${owner}/${repo}/contents/${path}`
    const body: Record<string, string> = {
      access_token: this.token,
      message: message || `更新 ${path}`,
      content: btoa(unescape(encodeURIComponent(content))),
    }
    if (sha) body.sha = sha

    const existing = sha ? true : !!(await this._readFile(owner, repo, path))
    const method = existing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: this.jsonHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`写入文件失败: ${path} - ${err.message || res.status}`)
    }
    const data = await res.json()
    return data.content?.sha || sha || ''
  }

  static async readPublicRepoFile(apiUrl: string, owner: string, repo: string, path: string): Promise<FileResult | null> {
    const base = apiUrl || DEFAULT_API_URLS.gitee
    const url = `${base}/repos/${owner}/${repo}/contents/${path}`
    const res = await fetch(url)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`读取公开文件失败: ${owner}/${repo}/${path}`)
    const data = await res.json()
    return {
      content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))),
      sha: data.sha || '',
    }
  }
}
