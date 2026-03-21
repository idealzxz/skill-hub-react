import { useState } from 'react'
import { Github, LogOut, CheckCircle, RefreshCw } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { GitHubService } from '../services/github'
import { pullFromGitHub } from '../services/sync'

export default function SettingsPage() {
  const { state, dispatch, toast } = useApp()
  const [tokenInput, setTokenInput] = useState('')
  const [connecting, setConnecting] = useState(false)

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

  const clearAll = () => {
    if (!confirm('确定要清除所有数据吗？此操作不可撤销。')) return
    localStorage.removeItem('sh_favorites')
    localStorage.removeItem('sh_theme')
    localStorage.removeItem('sh_recent')
    localStorage.removeItem('sh_my_skills')
    localStorage.removeItem('sh_github_token')
    localStorage.removeItem('sh_github_user')
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
                { keys: 'Alt + 1~7', action: '技能市场 / 我的技能 / ...' },
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
