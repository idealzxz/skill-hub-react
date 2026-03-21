import { useState } from 'react'
import { Github, LogOut, CheckCircle, RefreshCw, Users, Plus, Trash2, ExternalLink } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { GitHubService } from '../services/github'
import { GitLabService } from '../services/gitlab'
import { GiteeService } from '../services/gitee'
import { pullFromProvider } from '../services/sync'
import { type GitProviderType, PROVIDER_LABELS, PROVIDER_TOKEN_HINTS, detectPlatformFromUrl, DEFAULT_WEB_URLS } from '../services/git-provider'

const PLATFORM_OPTIONS: { id: GitProviderType; label: string; icon: string }[] = [
  { id: 'github', label: 'GitHub', icon: '🐙' },
  { id: 'gitlab', label: 'GitLab', icon: '🦊' },
  { id: 'gitee', label: 'Gitee', icon: '🟥' },
]

export default function SettingsPage() {
  const { state, dispatch, toast } = useApp()
  const [tokenInput, setTokenInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<GitProviderType>('github')
  const [repoInput, setRepoInput] = useState('')
  const [addingRepo, setAddingRepo] = useState(false)

  const connectProvider = async () => {
    if (!tokenInput.trim()) { toast(`请输入 ${PROVIDER_LABELS[selectedPlatform]} Token`); return }
    setConnecting(true)
    try {
      let provider
      switch (selectedPlatform) {
        case 'gitlab': provider = new GitLabService(tokenInput.trim()); break
        case 'gitee': provider = new GiteeService(tokenInput.trim()); break
        default: provider = new GitHubService(tokenInput.trim()); break
      }
      const user = await provider.getUser()
      dispatch({ type: 'SET_GITHUB_AUTH', token: tokenInput.trim(), user, providerType: selectedPlatform })
      toast(`已连接 ${PROVIDER_LABELS[selectedPlatform]}: @${user.login}`)
      setTokenInput('')

      dispatch({ type: 'SET_SYNC_STATUS', status: 'syncing', message: '首次同步...' })
      const result = await pullFromProvider(provider, user)
      dispatch({ type: 'SET_MY_SKILLS', skills: result.mySkills })
      if (result.favorites.length > 0) dispatch({ type: 'SET_FAVORITES', favorites: result.favorites })
      if (result.indexSha) dispatch({ type: 'SET_INDEX_SHA', sha: result.indexSha })
      if (result.favSha) dispatch({ type: 'SET_FAV_SHA', sha: result.favSha })
      if (result.settingsSha) dispatch({ type: 'SET_SETTINGS_SHA', sha: result.settingsSha })
      if (result.settings) {
        if (result.settings.theme) dispatch({ type: 'SET_THEME', theme: result.settings.theme })
        if (result.settings.teamRepos?.length) dispatch({ type: 'SET_TEAM_REPOS', repos: result.settings.teamRepos })
      }
      dispatch({ type: 'SET_SYNC_STATUS', status: 'idle' })
      toast('同步完成')
    } catch (err) {
      toast('连接失败: ' + String(err))
      dispatch({ type: 'SET_SYNC_STATUS', status: 'error', message: String(err) })
    }
    setConnecting(false)
  }

  const disconnectProvider = () => {
    dispatch({ type: 'SET_GITHUB_AUTH', token: null, user: null })
    localStorage.removeItem('sh_github_token')
    localStorage.removeItem('sh_github_user')
    localStorage.removeItem('sh_git_provider')
    toast(`已断开 ${PROVIDER_LABELS[state.gitProviderType]} 连接`)
  }

  const parseRepoInput = (input: string): { owner: string; repo: string; platform: GitProviderType } | null => {
    const trimmed = input.trim().replace(/\/+$/, '')
    const platform = detectPlatformFromUrl(trimmed)
    const urlMatch = trimmed.match(/(?:github\.com|gitlab\.com|gitee\.com)\/([^/]+)\/([^/]+)/)
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, ''), platform }
    const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/)
    if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2], platform: state.gitProviderType || 'github' }
    return null
  }

  const verifyRepo = async (owner: string, repo: string, platform: GitProviderType): Promise<boolean> => {
    const token = state.githubToken && state.gitProviderType === platform ? state.githubToken : null
    if (platform === 'github') {
      const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })
      return res.ok
    }
    if (platform === 'gitlab') {
      const pid = encodeURIComponent(`${owner}/${repo}`)
      const url = token
        ? `https://gitlab.com/api/v4/projects/${pid}`
        : `https://gitlab.com/api/v4/projects/${pid}`
      const headers: Record<string, string> = {}
      if (token) headers['PRIVATE-TOKEN'] = token
      const res = await fetch(url, { headers })
      return res.ok
    }
    if (platform === 'gitee') {
      const url = token
        ? `https://gitee.com/api/v5/repos/${owner}/${repo}?access_token=${token}`
        : `https://gitee.com/api/v5/repos/${owner}/${repo}`
      const res = await fetch(url)
      return res.ok
    }
    return false
  }

  const addTeamRepo = async () => {
    const parsed = parseRepoInput(repoInput)
    if (!parsed) { toast('请输入仓库地址，如 org/repo 或完整链接'); return }
    const { owner, repo, platform } = parsed
    if (state.teamRepos.some((r) => r.owner === owner && r.repo === repo && r.platform === platform)) {
      toast('该仓库已添加'); return
    }
    setAddingRepo(true)
    try {
      const ok = await verifyRepo(owner, repo, platform)
      if (!ok) throw new Error('仓库不存在或无权访问')
      dispatch({
        type: 'ADD_TEAM_REPO',
        repo: { id: `tr-${Date.now()}`, owner, repo, label: `${owner}/${repo}`, platform },
      })
      setRepoInput('')
      toast(`已添加 ${PROVIDER_LABELS[platform]} 仓库: ${owner}/${repo}`)
    } catch (err) {
      toast('添加失败: ' + String(err))
    }
    setAddingRepo(false)
  }

  const removeTeamRepo = (id: string, label: string) => {
    if (!confirm(`确定要移除团队仓库「${label}」吗？`)) return
    dispatch({ type: 'REMOVE_TEAM_REPO', repoId: id })
    const remaining = state.teamSkills.filter((s) => s.repoId !== id)
    dispatch({ type: 'SET_TEAM_SKILLS', skills: remaining })
    toast(`已移除: ${label}`)
  }

  const clearAll = () => {
    if (!confirm('确定要清除所有数据吗？此操作不可撤销。')) return
    localStorage.removeItem('sh_favorites')
    localStorage.removeItem('sh_theme')
    localStorage.removeItem('sh_recent')
    localStorage.removeItem('sh_my_skills')
    localStorage.removeItem('sh_github_token')
    localStorage.removeItem('sh_github_user')
    localStorage.removeItem('sh_git_provider')
    localStorage.removeItem('sh_team_repos')
    localStorage.removeItem('sh_index_sha')
    localStorage.removeItem('sh_fav_sha')
    localStorage.removeItem('sh_settings_sha')
    dispatch({ type: 'CLEAR_ALL' })
    toast('所有数据已清除')
  }

  return (
    <div className="fade-in">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-8">设置</h2>
        <div className="space-y-6">

          {/* Git Provider Binding */}
          <div className="glass-elevated rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Github className="w-5 h-5" />
              <h3 className="font-semibold">Git 平台绑定</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              绑定 Git 平台后，你的技能、收藏、主题和团队仓库等设置会自动同步到<strong>私有</strong>仓库 <code className="text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">cursor-skills</code>，换设备登录即可恢复
            </p>

            {state.githubUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl glass-subtle">
                  <img src={state.githubUser.avatar_url} alt="" className="w-12 h-12 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{state.githubUser.name || state.githubUser.login}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">@{state.githubUser.login}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-accent text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>{PROVIDER_LABELS[state.gitProviderType]}</span>
                  </div>
                </div>
                <div className="text-xs rounded-xl p-3 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 space-y-1">
                  <p className="font-medium">以下数据已自动同步到私有仓库：</p>
                  <ul className="list-disc list-inside text-green-600 dark:text-green-400 space-y-0.5 ml-1">
                    <li>我的技能（SKILL.md 文件）</li>
                    <li>收藏列表（favorites.json）</li>
                    <li>主题和团队仓库（settings.json）</li>
                  </ul>
                </div>
                <button onClick={disconnectProvider} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-subtle !border-red-200/60 dark:!border-red-500/20 text-red-500 text-sm cursor-pointer hover:bg-red-50/60 dark:hover:bg-red-500/10 transition-all">
                  <LogOut className="w-4 h-4" />断开连接
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                        selectedPlatform === p.id
                          ? 'bg-primary/90 backdrop-blur-sm text-white shadow-lg shadow-primary/20 border border-transparent'
                          : 'glass-subtle !border-transparent text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'
                      }`}
                    >
                      <span>{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Personal Access Token</label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder={PROVIDER_TOKEN_HINTS[selectedPlatform].placeholder}
                    className="w-full px-4 py-2.5 rounded-2xl glass-subtle text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && connectProvider()}
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    在 <a href={PROVIDER_TOKEN_HINTS[selectedPlatform].helpUrl} target="_blank" rel="noopener" className="text-primary hover:underline">{PROVIDER_TOKEN_HINTS[selectedPlatform].helpText}</a> 创建，勾选 <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded">{PROVIDER_TOKEN_HINTS[selectedPlatform].scope}</code> 权限
                  </p>
                </div>
                <button onClick={connectProvider} disabled={connecting} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/90 backdrop-blur-sm text-white text-sm font-medium cursor-pointer hover:bg-primary transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                  {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                  {connecting ? '连接中...' : `连接 ${PROVIDER_LABELS[selectedPlatform]}`}
                </button>
              </div>
            )}
          </div>

          {/* Team Repos */}
          <div className="glass-elevated rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5" />
              <h3 className="font-semibold">团队仓库管理</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              订阅 Git 仓库作为团队技能源，支持 GitHub / GitLab / Gitee。
            </p>
            <div className={`text-xs rounded-xl p-3 mb-4 ${state.githubToken ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
              {state.githubToken ? (
                <span>已绑定 {PROVIDER_LABELS[state.gitProviderType]} — 同平台私有仓库可直接添加，其他平台仅支持公开仓库</span>
              ) : (
                <span>当前未绑定平台，仅支持公开仓库。如需添加私有仓库，请先在上方绑定账号</span>
              )}
            </div>

            {state.teamRepos.length > 0 && (
              <div className="space-y-2 mb-4">
                {state.teamRepos.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl glass-subtle">
                    <div className="w-8 h-8 rounded-xl glass-icon flex items-center justify-center shrink-0 text-sm">
                      {r.platform === 'gitlab' ? '🦊' : r.platform === 'gitee' ? '🟥' : '🐙'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.label}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{PROVIDER_LABELS[r.platform]} · {r.owner}/{r.repo}</p>
                    </div>
                    {r.lastSynced && (
                      <span className="text-[10px] text-gray-400 shrink-0 hidden sm:block">
                        {new Date(r.lastSynced).toLocaleDateString()}
                      </span>
                    )}
                    <a
                      href={`${DEFAULT_WEB_URLS[r.platform]}/${r.owner}/${r.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 cursor-pointer transition-all shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </a>
                    <button
                      onClick={() => removeTeamRepo(r.id, r.label)}
                      className="p-1.5 rounded-xl hover:bg-red-50/60 dark:hover:bg-red-500/10 cursor-pointer transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="org/repo 或 https://github.com|gitlab.com|gitee.com/org/repo"
                className="flex-1 px-4 py-2.5 rounded-2xl glass-subtle text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && addTeamRepo()}
              />
              <button
                onClick={addTeamRepo}
                disabled={addingRepo}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/90 backdrop-blur-sm text-white text-sm font-medium cursor-pointer hover:bg-primary transition-all shadow-lg shadow-primary/20 disabled:opacity-50 shrink-0"
              >
                {addingRepo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addingRepo ? '验证中...' : '添加'}
              </button>
            </div>
          </div>

          {/* Theme */}
          <div className="glass-elevated rounded-2xl p-6">
            <h3 className="font-semibold mb-1">主题</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">选择你喜欢的界面主题</p>
            <div className="flex gap-3">
              {([['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']] as const).map(([opt, label]) => (
                <button key={opt} onClick={() => dispatch({ type: 'SET_THEME', theme: opt })} className={`flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${state.theme === opt ? 'bg-primary/90 backdrop-blur-sm text-white shadow-lg shadow-primary/20 border border-transparent' : 'glass-subtle text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="glass-elevated rounded-2xl p-6">
            <h3 className="font-semibold mb-4">键盘快捷键</h3>
            <div className="space-y-3">
              {[
                { keys: 'Ctrl + K', action: '搜索' },
                { keys: 'Ctrl + J', action: '切换主题' },
                { keys: 'Alt + 1~8', action: '技能市场 / 我的技能 / 团队技能 / ...' },
              ].map((s) => (
                <div key={s.keys} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{s.action}</span>
                  <kbd className="px-2.5 py-1 rounded-xl glass-subtle text-xs font-mono font-semibold text-gray-600 dark:text-gray-300">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Data */}
          <div className="glass-elevated rounded-2xl p-6">
            <h3 className="font-semibold mb-1">数据管理</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">管理本地缓存和数据</p>
            <button onClick={clearAll} className="px-5 py-2.5 rounded-2xl glass-subtle !border-red-200/60 dark:!border-red-500/20 text-red-500 text-sm font-medium cursor-pointer hover:bg-red-50/60 dark:hover:bg-red-500/10 transition-all">
              清除所有数据
            </button>
          </div>

          {/* About */}
          <div className="glass-elevated rounded-2xl p-6">
            <h3 className="font-semibold mb-3">关于</h3>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <p>Skill Hub v2.0.0 — React Edition</p>
              <p>一个优雅的 Cursor 技能管理工具，帮助你发现和管理最佳技能。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
