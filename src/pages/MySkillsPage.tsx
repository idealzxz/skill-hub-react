import { useState } from 'react'
import { Plus, RefreshCw, Cloud, CloudOff, Edit, Trash2, CheckCircle, AlertCircle, GitBranch, Copy, Check, Eye } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { CAT_COLORS, type UserSkill } from '../data/skills'
import { createNewSkill } from '../services/sync'
import { pullFromGitHub, deleteSkillRemote } from '../services/sync'
import { copyToClipboard } from '../utils'
import { DEFAULT_WEB_URLS } from '../services/git-provider'

export default function MySkillsPage() {
  const { state, dispatch, toast, getGitHub, openDetail } = useApp()
  const [showClonePanel, setShowClonePanel] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleNew = () => {
    const author = state.githubUser?.login || 'me'
    const skill = createNewSkill(author, state.mySkills.length)
    dispatch({ type: 'SET_EDITING_SKILL', skill })
    dispatch({ type: 'SET_TAB', tab: 'editor' })
  }

  const handleEdit = (skill: UserSkill) => {
    dispatch({ type: 'SET_EDITING_SKILL', skill })
    dispatch({ type: 'SET_TAB', tab: 'editor' })
  }

  const handleDelete = async (skill: UserSkill) => {
    if (!confirm(`确定要删除「${skill.name}」吗？`)) return

    const gh = getGitHub()
    if (gh && state.githubUser && skill.sha) {
      try {
        dispatch({ type: 'SET_SYNC_STATUS', status: 'syncing', message: '正在删除...' })
        const metas = state.mySkills
          .filter((s) => s.id !== skill.id)
          .map((s) => ({ id: s.id, name: s.name, author: s.author, description: s.description, category: s.category, tags: s.tags, version: s.version, color: s.color, createdAt: s.updatedAt, updatedAt: s.updatedAt }))
        const newSha = await deleteSkillRemote(gh, state.githubUser, skill, metas, state.indexSha)
        dispatch({ type: 'SET_INDEX_SHA', sha: newSha })
        dispatch({ type: 'SET_SYNC_STATUS', status: 'idle' })
      } catch (err) {
        dispatch({ type: 'SET_SYNC_STATUS', status: 'error', message: String(err) })
      }
    }

    dispatch({ type: 'DELETE_MY_SKILL', skillId: skill.id })
    toast('技能已删除')
  }

  const handleSync = async () => {
    const gh = getGitHub()
    if (!gh || !state.githubUser) {
      toast('请先在设置中绑定 GitHub')
      dispatch({ type: 'SET_TAB', tab: 'settings' })
      return
    }

    try {
      dispatch({ type: 'SET_SYNC_STATUS', status: 'syncing', message: '正在同步...' })
      const result = await pullFromGitHub(gh, state.githubUser)
      dispatch({ type: 'SET_MY_SKILLS', skills: result.mySkills })
      if (result.favorites.length > 0) dispatch({ type: 'SET_FAVORITES', favorites: result.favorites })
      if (result.indexSha) dispatch({ type: 'SET_INDEX_SHA', sha: result.indexSha })
      if (result.favSha) dispatch({ type: 'SET_FAV_SHA', sha: result.favSha })
      dispatch({ type: 'SET_SYNC_STATUS', status: 'idle' })
      toast('同步完成')
    } catch (err) {
      dispatch({ type: 'SET_SYNC_STATUS', status: 'error', message: String(err) })
      toast('同步失败: ' + String(err))
    }
  }

  const getCloneAllCommand = (): string | null => {
    if (!state.githubUser) return null
    const webUrl = DEFAULT_WEB_URLS[state.gitProviderType]
    return `git clone ${webUrl}/${state.githubUser.login}/cursor-skills.git ~/.cursor/skills/${state.githubUser.login}-cursor-skills`
  }

  const handleCopyCommand = async (cmd: string, id: string) => {
    const ok = await copyToClipboard(cmd)
    if (ok) {
      setCopiedId(id)
      toast('已复制安装命令')
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleCopyInstall = async (skill: UserSkill) => {
    const cmd = skill.installCommand || generateInstallCommand(skill)
    const ok = await copyToClipboard(cmd)
    if (ok) {
      setCopiedId(skill.id)
      toast('已复制安装命令')
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const generateInstallCommand = (skill: UserSkill): string => {
    if (state.githubUser) {
      const webUrl = DEFAULT_WEB_URLS[state.gitProviderType]
      return `git clone ${webUrl}/${state.githubUser.login}/cursor-skills.git ~/.cursor/skills-sync && cp -r ~/.cursor/skills-sync/skills/${skill.name} ~/.cursor/skills/${skill.name}`
    }
    return `# 请先绑定 Git 平台后再获取安装命令`
  }

  const syncIcon = (s: UserSkill['syncStatus']) => {
    if (s === 'synced') return <CheckCircle className="w-3.5 h-3.5 text-accent" />
    if (s === 'local') return <CloudOff className="w-3.5 h-3.5 text-amber-500" />
    return <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
  }

  const syncLabel = (s: UserSkill['syncStatus']) => {
    if (s === 'synced') return '已同步'
    if (s === 'local') return '仅本地'
    return '已修改'
  }

  return (
    <div className="fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">我的技能</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {state.mySkills.length} 个自建技能
              {state.githubUser && (
                <span className="ml-2">
                  · 同步到 <span className="text-primary dark:text-primary-light font-mono">@{state.githubUser.login}/cursor-skills</span>
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowClonePanel(!showClonePanel)} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm cursor-pointer transition-all duration-300 ${showClonePanel ? 'glass-subtle !border-primary/30 text-primary' : 'glass-subtle hover:bg-white/40 dark:hover:bg-white/10'}`}>
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">安装到本地</span>
            </button>
            <button onClick={handleSync} disabled={state.syncStatus === 'syncing'} className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-subtle hover:bg-white/40 dark:hover:bg-white/10 text-sm cursor-pointer transition-all disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${state.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {state.syncStatus === 'syncing' ? '同步中...' : '同步'}
            </button>
            <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/90 backdrop-blur-sm text-white text-sm cursor-pointer hover:bg-primary transition-all shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />新建技能
            </button>
          </div>
        </div>

        {state.syncStatus === 'error' && (
          <div className="mb-6 p-4 rounded-2xl glass-subtle !bg-red-50/60 dark:!bg-red-500/10 !border-red-200/60 dark:!border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {state.syncMessage}
          </div>
        )}

        {showClonePanel && (
          <div className="mb-6 glass-elevated rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                安装全部技能到本地
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                复制下方命令在终端执行，即可将仓库中的所有技能 clone 到本地 Cursor skills 目录
              </p>
            </div>

            {state.githubUser && getCloneAllCommand() ? (
              <div className="relative group/code">
                <pre className="bg-gray-900/90 dark:bg-black/60 backdrop-blur-sm text-green-400 rounded-2xl p-4 pr-12 text-sm font-mono overflow-x-auto border border-white/5">
                  <code>{getCloneAllCommand()}</code>
                </pre>
                <button
                  onClick={() => handleCopyCommand(getCloneAllCommand()!, 'my-repo')}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white cursor-pointer transition-all opacity-0 group-hover/code:opacity-100"
                >
                  {copiedId === 'my-repo' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                请先在<button onClick={() => dispatch({ type: 'SET_TAB', tab: 'settings' })} className="text-primary hover:underline cursor-pointer mx-1">设置</button>中绑定 GitHub 账号后获取安装命令
              </p>
            )}
          </div>
        )}

        {state.mySkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.mySkills.map((skill) => (
              <div
                key={skill.id}
                className="group glass-elevated glass-hover rounded-2xl p-5 cursor-pointer"
                onClick={() => openDetail({ ...skill, installCommand: skill.installCommand || generateInstallCommand(skill) })}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-lg" style={{ background: `linear-gradient(135deg, ${skill.color}, ${skill.color}CC)` }}>
                      {(skill.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary dark:group-hover:text-primary-light transition-colors">{skill.name || '(未命名)'}</h3>
                      <p className="text-xs text-gray-400 truncate">@{skill.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    {syncIcon(skill.syncStatus)}
                    <span>{syncLabel(skill.syncStatus)}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                  {skill.description || '暂无描述'}
                </p>

                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${CAT_COLORS[skill.category] || 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'}`}>
                    {skill.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyInstall(skill) }}
                      className="p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 cursor-pointer transition-all text-gray-400 hover:text-green-500"
                      title="复制安装命令"
                    >
                      {copiedId === skill.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openDetail({ ...skill, installCommand: skill.installCommand || generateInstallCommand(skill) }) }}
                      className="p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 cursor-pointer transition-all text-gray-400 hover:text-primary"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(skill) }}
                      className="p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 cursor-pointer transition-all text-gray-400 hover:text-primary"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(skill) }}
                      className="p-1.5 rounded-xl hover:bg-red-50/60 dark:hover:bg-red-500/10 cursor-pointer transition-all text-gray-400 hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl glass-elevated flex items-center justify-center">
              <Cloud className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">还没有创建任何技能</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">创建你自己的 Cursor 技能，并通过 GitHub 同步到所有设备</p>
            <button onClick={handleNew} className="px-6 py-3 rounded-2xl bg-primary/90 backdrop-blur-sm text-white cursor-pointer hover:bg-primary transition-all shadow-lg shadow-primary/20">
              创建第一个技能
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
