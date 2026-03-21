import { Plus, RefreshCw, Cloud, CloudOff, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { CAT_COLORS, type UserSkill } from '../data/skills'
import { createNewSkill } from '../services/sync'
import { pullFromGitHub, deleteSkillRemote } from '../services/sync'

export default function MySkillsPage() {
  const { state, dispatch, toast, getGitHub } = useApp()

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
            <button onClick={handleSync} disabled={state.syncStatus === 'syncing'} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-sm cursor-pointer transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${state.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {state.syncStatus === 'syncing' ? '同步中...' : '同步'}
            </button>
            <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm cursor-pointer hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4" />新建技能
            </button>
          </div>
        </div>

        {state.syncStatus === 'error' && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
            {state.syncMessage}
          </div>
        )}

        {state.mySkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.mySkills.map((skill) => (
              <div key={skill.id} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold" style={{ background: skill.color }}>
                      {(skill.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{skill.name || '(未命名)'}</h3>
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
                    <button onClick={() => handleEdit(skill)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors text-gray-400 hover:text-primary">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(skill)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer transition-colors text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Cloud className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">还没有创建任何技能</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">创建你自己的 Cursor 技能，并通过 GitHub 同步到所有设备</p>
            <button onClick={handleNew} className="px-6 py-3 rounded-xl bg-primary text-white cursor-pointer hover:bg-primary-dark transition-colors">
              创建第一个技能
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
