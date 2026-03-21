import { useState, useCallback } from 'react'
import { ArrowLeft, Save, Cloud, Eye, Edit3, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { CATEGORIES, type UserSkill, pickColor } from '../data/skills'
import { pushSkill } from '../services/sync'
import MarkdownPreview from '../components/MarkdownPreview'

export default function SkillEditorPage() {
  const { state, dispatch, toast, getGitHub, getMetas } = useApp()

  const skill = state.editingSkill
  const [form, setForm] = useState<UserSkill>(
    skill || {
      id: '', name: '', author: '', description: '', category: 'AI & ML',
      tags: [], stars: 0, downloads: 0, version: '1.0.0', color: pickColor(0),
      installCommand: '', updatedAt: new Date().toISOString(), isOwned: true,
      skillMdContent: '# 新技能\n\n在这里编写技能的详细说明...\n',
      repoPath: '', syncStatus: 'local',
    },
  )
  const [tagInput, setTagInput] = useState('')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  const updateField = useCallback(<K extends keyof UserSkill>(key: K, value: UserSkill[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      updateField('tags', [...form.tags, tag])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    updateField('tags', form.tags.filter((t) => t !== tag))
  }

  const handleSave = async (syncToGitHub: boolean) => {
    if (!form.name.trim()) {
      toast('请输入技能名称')
      return
    }

    const now = new Date().toISOString()
    const updated: UserSkill = {
      ...form,
      updatedAt: now,
      repoPath: `skills/${form.name}/SKILL.md`,
      installCommand: state.githubUser
        ? `git clone https://github.com/${state.githubUser.login}/cursor-skills.git ~/.cursor/skills && cd ~/.cursor/skills/skills/${form.name}`
        : form.installCommand,
    }

    if (syncToGitHub) {
      const gh = getGitHub()
      if (!gh || !state.githubUser) {
        toast('请先在设置中绑定 GitHub')
        return
      }

      setSaving(true)
      try {
        dispatch({ type: 'SET_SYNC_STATUS', status: 'syncing', message: '正在保存到 GitHub...' })
        const metas = getMetas()
        const { fileSha, newIndexSha } = await pushSkill(gh, state.githubUser, updated, metas, state.indexSha)
        updated.sha = fileSha
        updated.syncStatus = 'synced'
        updated.lastSynced = now
        dispatch({ type: 'SET_INDEX_SHA', sha: newIndexSha })
        dispatch({ type: 'SET_SYNC_STATUS', status: 'idle' })
        toast('已保存并同步到 GitHub')
      } catch (err) {
        dispatch({ type: 'SET_SYNC_STATUS', status: 'error', message: String(err) })
        toast('同步失败: ' + String(err))
        setSaving(false)
        return
      }
      setSaving(false)
    } else {
      updated.syncStatus = updated.sha ? 'modified' : 'local'
      toast('已保存到本地')
    }

    const exists = state.mySkills.some((s) => s.id === updated.id)
    if (exists) {
      dispatch({ type: 'UPDATE_MY_SKILL', skill: updated })
    } else {
      dispatch({ type: 'ADD_MY_SKILL', skill: updated })
    }

    dispatch({ type: 'SET_EDITING_SKILL', skill: null })
    dispatch({ type: 'SET_TAB', tab: 'myskills' })
  }

  const handleBack = () => {
    dispatch({ type: 'SET_EDITING_SKILL', skill: null })
    dispatch({ type: 'SET_TAB', tab: 'myskills' })
  }

  return (
    <div className="fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold">{skill ? '编辑技能' : '新建技能'}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-sm cursor-pointer transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />仅保存本地
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm cursor-pointer hover:bg-primary-dark transition-colors disabled:opacity-50">
              <Cloud className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
              {saving ? '同步中...' : '保存并同步'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metadata Form */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">基本信息</h3>

              <div>
                <label className="block text-sm font-medium mb-1.5">技能名称 <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="my-awesome-skill" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <p className="text-xs text-gray-400 mt-1">只能包含字母、数字、连字符和下划线</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">描述</label>
                <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="简要描述这个技能的用途..." rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">分类</label>
                <select value={form.category} onChange={(e) => updateField('category', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all">
                  {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">版本</label>
                <input type="text" value={form.version} onChange={(e) => updateField('version', e.target.value)} placeholder="1.0.0" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">标签</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="输入标签后回车" className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                  <button onClick={addTag} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">添加</button>
                </div>
              </div>
            </div>
          </div>

          {/* Markdown Editor */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: '500px' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
              <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">SKILL.md</h3>
              <div className="flex gap-1">
                <button onClick={() => setPreview(false)} className={`p-1.5 rounded-lg cursor-pointer transition-colors ${!preview ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}>
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => setPreview(true)} className={`p-1.5 rounded-lg cursor-pointer transition-colors ${preview ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}>
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {preview ? (
                <div className="p-6">
                  <MarkdownPreview content={form.skillMdContent} />
                </div>
              ) : (
                <textarea
                  value={form.skillMdContent}
                  onChange={(e) => updateField('skillMdContent', e.target.value)}
                  className="w-full h-full p-4 bg-transparent text-sm font-mono focus:outline-none resize-none"
                  style={{ minHeight: '450px' }}
                  placeholder="在这里编写 SKILL.md 的内容..."
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
