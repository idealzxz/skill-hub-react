import { useMemo, useRef, useState } from 'react'
import { Heart, Download, Upload, Copy, Check, Terminal, Monitor, Apple, Package, Cloud, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { copyToClipboard, resolveFavoriteSkills } from '../utils'
import SkillCard from '../components/SkillCard'
import { type Platform, buildBatchInstallCommand, buildSingleInstallCommand } from '../utils/installCommands'
import type { TeamSkill } from '../data/skills'

export default function FavoritesPage() {
  const { state, dispatch, toast, syncFavorites } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [showBatchPanel, setShowBatchPanel] = useState(false)
  const [platform, setPlatform] = useState<Platform>('Windows')
  const [copiedKey, setCopiedKey] = useState('')

  const favoriteSkills = useMemo(
    () => resolveFavoriteSkills(state.favorites, state.skills, state.mySkills, state.teamSkills),
    [state.favorites, state.skills, state.mySkills, state.teamSkills],
  )

  const orphanCount = state.favorites.length - favoriteSkills.length

  const batchCommand = useMemo(() => {
    return buildBatchInstallCommand(favoriteSkills, platform)
  }, [favoriteSkills, platform])

  const handleCopy = async (text: string, key: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopiedKey(key)
      toast('已复制到剪贴板')
      setTimeout(() => setCopiedKey(''), 2000)
    }
  }

  const exportFavorites = () => {
    const data = JSON.stringify(favoriteSkills, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'skill-hub-favorites.json'
    a.click()
    URL.revokeObjectURL(url)
    toast('收藏已导出')
  }

  const importFavorites = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (Array.isArray(data)) {
          const ids = data.map((s: { id?: string }) => s.id).filter(Boolean) as string[]
          const merged = [...new Set([...state.favorites, ...ids])]
          dispatch({ type: 'SET_FAVORITES', favorites: merged })
          toast('收藏已导入')
        }
      } catch { /* */ }
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const platformIcons: Record<Platform, React.ReactNode> = {
    'Windows': <Monitor className="w-3.5 h-3.5" />,
    'macOS': <Apple className="w-3.5 h-3.5" />,
    'Linux': <Terminal className="w-3.5 h-3.5" />,
  }

  return (
    <div className="fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">我的收藏</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {favoriteSkills.length} 个技能已收藏
              {orphanCount > 0 && (
                <span className="ml-1.5 text-amber-500">
                  （{orphanCount} 个已失效
                  <button
                    onClick={() => {
                      const validIds = favoriteSkills.map((s) => s.id)
                      dispatch({ type: 'SET_FAVORITES', favorites: validIds })
                      toast(`已清理 ${orphanCount} 个失效收藏`)
                    }}
                    className="ml-1 underline cursor-pointer hover:text-amber-600 transition-colors"
                  >
                    清理
                  </button>
                  ）
                </span>
              )}
              {state.githubUser && (
                <span className="ml-2 inline-flex items-center gap-1">
                  ·
                  {state.favSyncStatus === 'syncing' ? (
                    <span className="inline-flex items-center gap-1 text-primary dark:text-primary-light">
                      <RefreshCw className="w-3 h-3 animate-spin" />同步中
                    </span>
                  ) : state.favSyncStatus === 'error' ? (
                    <span className="inline-flex items-center gap-1 text-red-500">
                      <AlertCircle className="w-3 h-3" />同步失败
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <CheckCircle className="w-3 h-3" />已同步
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
          {favoriteSkills.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowBatchPanel(!showBatchPanel)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm cursor-pointer transition-all font-medium ${
                  showBatchPanel
                    ? 'bg-primary/90 backdrop-blur-sm text-white shadow-lg shadow-primary/20'
                    : 'glass-subtle hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                <Package className="w-4 h-4" />批量安装
              </button>
              {state.githubUser ? (
                <button
                  onClick={async () => {
                    const ok = await syncFavorites()
                    toast(ok ? '收藏已同步到仓库' : '收藏同步失败，请检查网络与 Token 权限')
                  }}
                  disabled={state.favSyncStatus === 'syncing'}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-subtle hover:bg-white/40 dark:hover:bg-white/10 text-sm cursor-pointer transition-all disabled:opacity-50"
                >
                  <Cloud className={`w-4 h-4 ${state.favSyncStatus === 'syncing' ? 'animate-pulse' : ''}`} />同步
                </button>
              ) : (
                <button
                  onClick={() => {
                    dispatch({ type: 'SET_TAB', tab: 'settings' })
                    toast('请先绑定 Git 平台以同步收藏')
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-subtle hover:bg-white/40 dark:hover:bg-white/10 text-sm cursor-pointer transition-all text-amber-500"
                >
                  <Cloud className="w-4 h-4" />绑定同步
                </button>
              )}
              <button onClick={exportFavorites} className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-subtle hover:bg-white/40 dark:hover:bg-white/10 text-sm cursor-pointer transition-all">
                <Download className="w-4 h-4" />导出
              </button>
              <label className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-subtle hover:bg-white/40 dark:hover:bg-white/10 text-sm cursor-pointer transition-all">
                <Upload className="w-4 h-4" />导入
                <input ref={fileRef} type="file" accept=".json" onChange={importFavorites} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {showBatchPanel && favoriteSkills.length > 0 && (
          <div className="mb-8 glass-elevated rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">一键安装 {favoriteSkills.length} 个技能（Git HTTPS）</h3>
              <button
                onClick={() => handleCopy(batchCommand, 'batch')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/90 backdrop-blur-sm text-white cursor-pointer hover:bg-primary transition-all text-sm font-medium shadow-lg shadow-primary/20"
              >
                {copiedKey === 'batch' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedKey === 'batch' ? '已复制' : '复制全部命令'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">平台</span>
                {(['Windows', 'macOS', 'Linux'] as Platform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                      platform === p
                        ? 'bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary-light border border-primary/30'
                        : 'glass-subtle hover:bg-white/40 dark:hover:bg-white/10'
                    }`}
                  >
                    {platformIcons[p]}{p}
                  </button>
                ))}
              </div>

            </div>

            <div className="relative group/code">
              <pre className="bg-gray-900/90 dark:bg-black/60 backdrop-blur-sm text-green-400 rounded-2xl border border-white/5 p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                <code>{batchCommand}</code>
              </pre>
              <button
                onClick={() => handleCopy(batchCommand, 'batch-inline')}
                className="absolute top-3 right-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white cursor-pointer transition-all opacity-0 group-hover/code:opacity-100"
              >
                {copiedKey === 'batch-inline' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">逐个安装</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {favoriteSkills.map((skill) => {
                  const cmd = buildSingleInstallCommand(skill, platform)
                  const key = `single-${skill.id}`
                  return (
                    <div
                      key={skill.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass-subtle group/item"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                        style={{ background: `linear-gradient(135deg, ${skill.color || '#6366F1'}, ${skill.color || '#6366F1'}CC)` }}
                      >
                        {skill.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{skill.name}</p>
                        <p className="text-[10px] text-gray-400 truncate font-mono">{cmd}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(cmd, key)}
                        className="p-1.5 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-all opacity-0 group-hover/item:opacity-100 shrink-0"
                      >
                        {copiedKey === key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}

        {favoriteSkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                captionOverride={'repoId' in skill ? (skill as TeamSkill).repoLabel : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl glass-elevated flex items-center justify-center">
              <Heart className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">还没有收藏任何技能</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">在数据看板、我的技能或团队技能中收藏技能后即可在此查看</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => dispatch({ type: 'SET_TAB', tab: 'dashboard' })} className="px-5 py-2.5 rounded-2xl bg-primary/90 backdrop-blur-sm text-white text-sm cursor-pointer hover:bg-primary transition-all shadow-lg shadow-primary/20">
                数据看板
              </button>
              <button onClick={() => dispatch({ type: 'SET_TAB', tab: 'myskills' })} className="px-5 py-2.5 rounded-2xl glass-subtle text-sm cursor-pointer hover:bg-white/40 dark:hover:bg-white/10">
                我的技能
              </button>
              <button onClick={() => dispatch({ type: 'SET_TAB', tab: 'team' })} className="px-5 py-2.5 rounded-2xl glass-subtle text-sm cursor-pointer hover:bg-white/40 dark:hover:bg-white/10">
                团队技能
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
