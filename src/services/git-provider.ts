import type { SkillMeta, SkillBundle } from '../data/skills'

export type GitProviderType = 'github' | 'gitlab' | 'gitee'

/** 无 /api/v4 后缀，供 Web 链接与默认 API 根路径 */
function gitlabDefaultOrigin(): string {
  const v = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITLAB_API_BASE
  if (v && String(v).trim()) {
    return String(v)
      .replace(/\/$/, '')
      .replace(/\/api\/v4$/, '')
  }
  return 'https://gitlab2.dui88.com'
}

export interface GitUser {
  login: string
  avatar_url: string
  name: string | null
}

export interface FileResult {
  content: string
  sha: string
}

export interface GitProvider {
  readonly providerType: GitProviderType
  readonly apiUrl: string
  readonly webUrl: string

  getUser(): Promise<GitUser>
  ensureRepo(owner: string): Promise<void>
  readFile(owner: string, path: string): Promise<FileResult | null>
  writeFile(owner: string, path: string, content: string, sha?: string, message?: string): Promise<string>
  deleteFile(owner: string, path: string, sha: string): Promise<void>
  readIndex(owner: string): Promise<{ data: SkillMeta[]; sha: string } | null>
  writeIndex(owner: string, data: SkillMeta[], sha?: string): Promise<string>
  readFavorites(owner: string): Promise<{ data: string[]; sha: string } | null>
  writeFavorites(owner: string, data: string[], sha?: string): Promise<string>
  readRepoFile(owner: string, repo: string, path: string): Promise<FileResult | null>
  readRepoIndex(owner: string, repo: string): Promise<{ data: SkillMeta[]; sha: string } | null>
  readRepoBundles(owner: string, repo: string): Promise<SkillBundle[]>
  writeRepoFile(owner: string, repo: string, path: string, content: string, sha?: string, message?: string): Promise<string>
  forkRepo(owner: string, repo: string): Promise<string>
  createMergeRequest(owner: string, repo: string, title: string, body: string, head: string, base?: string): Promise<string>
  readSettings(owner: string): Promise<{ data: Record<string, unknown>; sha: string } | null>
  writeSettings(owner: string, data: Record<string, unknown>, sha?: string): Promise<string>
  /** 列出 cursor-skills 仓库下 skills/ 的一级子目录名（用于 index.json 为空 [] 时自动发现技能） */
  listSkillFolderNames(owner: string): Promise<string[]>
}

export interface GitProviderConfig {
  type: GitProviderType
  token: string
  apiUrl?: string
}

export const DEFAULT_API_URLS: Record<GitProviderType, string> = {
  github: 'https://api.github.com',
  /** GitLabService 会再拼 /api/v4；默认用 HTTPS，避免在 HTTPS 站点上出现混合内容导致 Failed to fetch */
  gitlab: `${gitlabDefaultOrigin()}/`,
  gitee: 'https://gitee.com/api/v5',
}

export const DEFAULT_WEB_URLS: Record<GitProviderType, string> = {
  github: 'https://github.com',
  gitlab: gitlabDefaultOrigin(),
  gitee: 'https://gitee.com',
}

/** 浏览器直连 api.github.com 失败时，开发环境可在 .env 设 VITE_DEV_GITHUB_PROXY=1，请求走 Vite 代理（见 vite.config.ts） */
export const GITHUB_API_PROXY_PATH = '/__skillhub_github'

/**
 * GitHub REST API 根 URL。支持 VITE_GITHUB_API_BASE 覆盖（如企业反代）。
 * 开发环境 VITE_DEV_GITHUB_PROXY=1 时使用同域代理路径，避免部分网络下浏览器无法访问 api.github.com。
 */
export function resolveGitHubApiBase(): string {
  const custom = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITHUB_API_BASE
  if (custom != null && String(custom).trim() !== '') {
    return String(custom).replace(/\/$/, '')
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && import.meta.env?.VITE_DEV_GITHUB_PROXY === '1') {
    return GITHUB_API_PROXY_PATH
  }
  return DEFAULT_API_URLS.github
}

/** 代理路径仅用于 API；克隆/网页链接仍指向 github.com */
export function githubApiBaseForWebUrl(apiBase: string): string {
  if (apiBase.startsWith('/')) return DEFAULT_API_URLS.github
  return apiBase
}

export function getWebUrl(type: GitProviderType, apiUrl?: string): string {
  if (!apiUrl) return DEFAULT_WEB_URLS[type]
  if (type === 'github') {
    if (apiUrl === DEFAULT_API_URLS.github) return DEFAULT_WEB_URLS.github
    return apiUrl.replace(/\/api\/v3\/?$/, '')
  }
  if (type === 'gitee') {
    return apiUrl.replace(/\/api\/v5\/?$/, '').replace(/\/$/, '')
  }
  return apiUrl.replace(/\/api\/v4\/?$/, '').replace(/\/$/, '')
}

export function getRepoCloneUrl(
  _type: GitProviderType, webUrl: string,
  owner: string, repo: string,
): string {
  return `${webUrl}/${owner}/${repo}.git`
}

export const PROVIDER_LABELS: Record<GitProviderType, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  gitee: 'Gitee',
}

export const PROVIDER_TOKEN_HINTS: Record<GitProviderType, { placeholder: string; helpUrl: string; helpText: string; scope: string }> = {
  github: {
    placeholder: 'ghp_xxxxxxxxxxxx',
    helpUrl: 'https://github.com/settings/tokens/new',
    helpText: 'GitHub Settings → Tokens (classic)',
    scope: 'repo',
  },
  gitlab: {
    placeholder: 'glpat-xxxxxxxxxxxx',
    helpUrl: `${gitlabDefaultOrigin()}/-/user_settings/personal_access_tokens`,
    helpText: 'GitLab → User Settings → Access Tokens',
    scope: 'api',
  },
  gitee: {
    placeholder: 'xxxxxxxxxxxxxxxx',
    helpUrl: 'https://gitee.com/personal_access_tokens',
    helpText: 'Gitee → 设置 → 私人令牌',
    scope: 'projects',
  },
}

export function detectPlatformFromUrl(input: string): GitProviderType {
  if (/gitlab\.com/i.test(input) || /gitlab\./i.test(input)) return 'gitlab'
  if (/gitee\.com/i.test(input)) return 'gitee'
  return 'github'
}
