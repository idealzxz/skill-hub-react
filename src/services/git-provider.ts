import type { SkillMeta, SkillBundle } from '../data/skills'

export type GitProviderType = 'github' | 'gitlab' | 'gitee'

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
}

export interface GitProviderConfig {
  type: GitProviderType
  token: string
  apiUrl?: string
}

export const DEFAULT_API_URLS: Record<GitProviderType, string> = {
  github: 'https://api.github.com',
  gitlab: 'https://gitlab.com',
  gitee: 'https://gitee.com/api/v5',
}

export const DEFAULT_WEB_URLS: Record<GitProviderType, string> = {
  github: 'https://github.com',
  gitlab: 'https://gitlab.com',
  gitee: 'https://gitee.com',
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
    helpUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens',
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
