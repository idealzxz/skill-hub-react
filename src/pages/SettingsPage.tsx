import { useState } from 'react'
import { Github, LogOut, CheckCircle, RefreshCw, Users, Plus, Trash2, ExternalLink } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { GitHubService } from '../services/github'
import { pullFromGitHub } from '../services/sync'

export default function SettingsPage() {
  const { state, dispatch, toast } = useApp()
  const [tokenInput, setTokenInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [repoInput, setRepoInput] = useState('')
  const [addingRepo, setAddingRepo] = useState(false)

  const connectGitHub = async () => {
    if (!tokenInput.trim()) { toast('请输入 GitHub Token'); return }
    setConnecting(true)
    try {
      const gh = new GitHubService(tokenInput.trim())
      const user = await gh.getUser()
      dispatch({ type: 'SET_GITHUB_AUTH', token: tokenInput.trim(), user })
      toast(`已连接: @${user.login}`)
      setTokenInput('')

      dispatch({ type: 'SET_SYNC_STATUS', status: 'syncing', message: '首次同步...' })
      const result = await pullFromGitHub(gh, user)
      dispatch({ type: 'SET_MY_SKILLS', skills: result.mySkills })
      if (result.favorites.length > 0) dispatch({ type: 'SET_FAVORITES', favorites: result.favorites })
      if (result.indexSha) dispatch({ type: 'SET_INDEX_SHA', sha: result.indexSha })
      if (result.favSha) dispatch({ type: 'SET_FAV_SHA', sha: result.favSha })
      dispatch({ type: 'SET_SYNC_STATUS', status: 'idle' })
      toast('同步完成')
    } catch (err) {
      toast('连接失败: ' + String(err))
      dispatch({ type: 'SET_SYNC_STATUS', status: 'error', message: String(err) })
    }
    setConnecting(false)
  }

  const disconnectGitHub = () => {
    dispatch({ type: 'SET_GITHUB_AUTH', token: null, user: null })
    localStorage.removeItem('sh_github_token')
    localStorage.removeItem('sh_github_user')
    toast('已断开 GitHub 连接')
  }

  const parseRepoInput = (input: string): { owner: string; repo: string } | null => {
    const trimmed = input.trim().replace(/\/+$/, '')
    const ghMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (ghMatch) return { owner: ghMatch[1], repo: ghMatch[2].replace(/\.git$/, '') }
    const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/)
    if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] }
    return null
  }

  const addTeamRepo = async () => {
    const parsed = parseRepoInput(repoInput)
    if (!parsed) { toast('请输入仓库地址，如 org/repo 或 GitHub 链接'); return }
    const { owner, repo } = parsed
    if (state.teamRepos.some((r) => r.owner === owner && r.repo === repo)) {
      toast('该仓库已添加'); return
    }
    setAddingRepo(true)
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      }
      if (state.githubToken) headers.Authorization = `Bearer ${state.githubToken}`
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })
      if (!res.ok) throw new Error(res.status === 404 ? '仓库不存在或无权访问' : '检查仓库失败')
      dispatch({
        type: 'ADD_TEAM_REPO',
        repo: { id: `tr-${Date.now()}`, owner, repo, label: `${owner}/${repo}` },
      })
      setRepoInput('')
      toast(`已添加团队仓库: ${owner}/${repo}`)
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
    localStorage.removeItem('sh_team_repos')
    dispatch({ type: 'CLEAR_ALL' })
    toast('所有数据已清除')
  }

  return (
    <div className="fade-in">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-8">设置</h2>
        <div className="space-y-6">

          {/* GitHub Binding */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Github className="w-5 h-5" />
              <h3 className="font-semibold">GitHub 账号绑定</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              绑定 GitHub 后，你的技能、收藏和设置会自动同步到 <code className="text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">cursor-skills</code> 仓库
            </p>

            {state.githubUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                  <img src={state.githubUser.avatar_url} alt="" className="w-12 h-12 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{state.githubUser.name || state.githubUser.login}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">@{state.githubUser.login}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-accent text-sm">
                    <CheckCircle className="w-4 h-4" />已连接
                  </div>
                </div>
                <button onClick={disconnectGitHub} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 text-sm cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <LogOut className="w-4 h-4" />断开连接
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">GitHub Personal Access Token</label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && connectGitHub()}
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    在 <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener" className="text-primary hover:underline">GitHub Settings → Tokens (classic)</a> 创建，勾选 <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded">repo</code> 权限
                  </p>
                </div>
                <button onClick={connectGitHub} disabled={connecting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium cursor-pointer hover:opacity-90 transition-colors disabled:opacity-50">
                  {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                  {connecting ? '连接中...' : '连接 GitHub'}
                </button>
              </div>
            )}
          </div>

          {/* Team Repos */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5" />
              <h3 className="font-semibold">团队仓库管理</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              订阅 GitHub 仓库作为团队技能源，同步仓库中的所有技能供团队使用。
            </p>
            <div className={`text-xs rounded-xl p-3 mb-4 ${state.githubToken ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
              {state.githubToken ? (
                <span>已绑定 GitHub Token — 支持添加公开和私有仓库</span>
              ) : (
                <span>当前未绑定 Token，仅支持公开仓库。如需添加私有仓库，请先在上方绑定 GitHub 账号</span>
              )}
            </div>

            {state.teamRepos.length > 0 && (
              <div className="space-y-2 mb-4">
                {state.teamRepos.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                      <Github className="w-4 h-4 text-primary dark:text-primary-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.label}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{r.owner}/{r.repo}</p>
                    </div>
                    {r.lastSynced && (
                      <span className="text-[10px] text-gray-400 shrink-0 hidden sm:block">
                        {new Date(r.lastSynced).toLocaleDateString()}
                      </span>
                    )}
                    <a
                      href={`https://github.com/${r.owner}/${r.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </a>
                    <button
                      onClick={() => removeTeamRepo(r.id, r.label)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer transition-colors shrink-0"
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
                placeholder="org/repo 或 https://github.com/org/repo"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && addTeamRepo()}
              />
              <button
                onClick={addTeamRepo}
                disabled={addingRepo}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium cursor-pointer hover:opacity-90 transition-colors disabled:opacity-50 shrink-0"
              >
                {addingRepo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addingRepo ? '验证中...' : '添加'}
              </button>
            </div>
          </div>

          {/* Theme */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold mb-1">主题</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">选择你喜欢的界面主题</p>
            <div className="flex gap-3">
              {([['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']] as const).map(([opt, label]) => (
                <button key={opt} onClick={() => dispatch({ type: 'SET_THEME', theme: opt })} className={`flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${state.theme === opt ? 'bg-primary text-white ring-2 ring-primary/30' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold mb-4">键盘快捷键</h3>
            <div className="space-y-3">
              {[
                { keys: 'Ctrl + K', action: '搜索' },
                { keys: 'Ctrl + J', action: '切换主题' },
                { keys: 'Alt + 1~8', action: '技能市场 / 我的技能 / 团队技能 / ...' },
              ].map((s) => (
                <div key={s.keys} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{s.action}</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-xs font-mono font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Data */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold mb-1">数据管理</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">管理本地缓存和数据</p>
            <button onClick={clearAll} className="px-5 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 text-sm font-medium cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              清除所有数据
            </button>
          </div>

          {/* About */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
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
