import type { SkillMeta, SkillBundle } from '../data/skills'
import { type GitProvider, type GitUser, type FileResult, type GitProviderType, DEFAULT_API_URLS, getWebUrl } from './git-provider'

const REPO_NAME = 'cursor-skills'

function encodePath(path: string) {
  return encodeURIComponent(path)
}

function projectPath(owner: string, repo: string) {
  return encodeURIComponent(`${owner}/${repo}`)
}

export class GitLabService implements GitProvider {
  readonly providerType: GitProviderType = 'gitlab'
  readonly apiUrl: string
  readonly webUrl: string
  private token: string

  constructor(token: string, apiUrl?: string) {
    this.token = token
    const base = (apiUrl || DEFAULT_API_URLS.gitlab).replace(/\/$/, '')
    this.apiUrl = base.includes('/api/v4') ? base : `${base}/api/v4`
    this.webUrl = getWebUrl('gitlab', this.apiUrl)
  }

  private headers() {
    return {
      'PRIVATE-TOKEN': this.token,
      'Content-Type': 'application/json',
    }
  }

  async getUser(): Promise<GitUser> {
    const res = await fetch(`${this.apiUrl}/user`, { headers: this.headers() })
    if (!res.ok) throw new Error('Token 无效或已过期')
    const data = await res.json()
    return { login: data.username, avatar_url: data.avatar_url, name: data.name }
  }

  async ensureRepo(owner: string): Promise<void> {
    const pid = projectPath(owner, REPO_NAME)
    const res = await fetch(`${this.apiUrl}/projects/${pid}`, { headers: this.headers() })
    if (res.ok) return
    if (res.status === 404) {
      const create = await fetch(`${this.apiUrl}/projects`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          name: REPO_NAME,
          description: 'Cursor Skills 管理仓库 - 由 Skill Hub 自动创建',
          visibility: 'public',
          initialize_with_readme: true,
        }),
      })
      if (!create.ok) throw new Error('创建仓库失败')
      await new Promise((r) => setTimeout(r, 1500))
      return
    }
    throw new Error('检查仓库失败')
  }

  private async _readFile(pid: string, path: string): Promise<FileResult | null> {
    const url = `${this.apiUrl}/projects/${pid}/repository/files/${encodePath(path)}?ref=main`
    const res = await fetch(url, { headers: this.headers() })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`读取文件失败: ${path}`)
    const data = await res.json()
    return {
      content: decodeURIComponent(escape(atob(data.content))),
      sha: data.blob_id || data.content_sha256 || '',
    }
  }

  private async _writeFile(
    pid: string, path: string, content: string,
    sha?: string, message?: string,
  ): Promise<string> {
    const existing = await this._readFile(pid, path)
    const method = existing ? 'PUT' : 'POST'
    const url = `${this.apiUrl}/projects/${pid}/repository/files/${encodePath(path)}`

    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: JSON.stringify({
        branch: 'main',
        content,
        commit_message: message || `更新 ${path}`,
        encoding: 'text',
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`写入文件失败: ${path} - ${err.message || res.status}`)
    }
    const data = await res.json()
    return data.blob_id || sha || ''
  }

  private async _deleteFile(pid: string, path: string, _sha: string): Promise<void> {
    const url = `${this.apiUrl}/projects/${pid}/repository/files/${encodePath(path)}`
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.headers(),
      body: JSON.stringify({ branch: 'main', commit_message: `删除 ${path}` }),
    })
    if (!res.ok && res.status !== 404) throw new Error(`删除文件失败: ${path}`)
  }

  async readFile(owner: string, path: string): Promise<FileResult | null> {
    return this._readFile(projectPath(owner, REPO_NAME), path)
  }

  async writeFile(owner: string, path: string, content: string, sha?: string, message?: string): Promise<string> {
    return this._writeFile(projectPath(owner, REPO_NAME), path, content, sha, message)
  }

  async deleteFile(owner: string, path: string, sha: string): Promise<void> {
    return this._deleteFile(projectPath(owner, REPO_NAME), path, sha)
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
    return this._readFile(projectPath(owner, repo), path)
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
    return this._writeFile(projectPath(owner, repo), path, content, sha, message)
  }

  async forkRepo(owner: string, repo: string): Promise<string> {
    const pid = projectPath(owner, repo)
    const res = await fetch(`${this.apiUrl}/projects/${pid}/fork`, {
      method: 'POST',
      headers: this.headers(),
    })
    if (!res.ok) {
      if (res.status === 409) return `${owner}/${repo}`
      throw new Error('Fork 仓库失败')
    }
    const data = await res.json()
    await new Promise((r) => setTimeout(r, 2000))
    return data.path_with_namespace
  }

  async createMergeRequest(
    owner: string, repo: string,
    title: string, body: string,
    head: string, base = 'main',
  ): Promise<string> {
    const pid = projectPath(owner, repo)
    const res = await fetch(`${this.apiUrl}/projects/${pid}/merge_requests`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        title,
        description: body,
        source_branch: head,
        target_branch: base,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`创建 MR 失败: ${err.message || res.status}`)
    }
    const data = await res.json()
    return data.web_url
  }

  static async readPublicRepoFile(apiUrl: string, owner: string, repo: string, path: string): Promise<FileResult | null> {
    const base = apiUrl.includes('/api/v4') ? apiUrl : `${apiUrl}/api/v4`
    const pid = encodeURIComponent(`${owner}/${repo}`)
    const url = `${base}/projects/${pid}/repository/files/${encodePath(path)}?ref=main`
    const res = await fetch(url)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`读取公开文件失败: ${owner}/${repo}/${path}`)
    const data = await res.json()
    return {
      content: decodeURIComponent(escape(atob(data.content))),
      sha: data.blob_id || '',
    }
  }
}
