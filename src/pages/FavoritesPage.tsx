import { useMemo, useRef } from 'react'
import { Heart, Download, Upload } from 'lucide-react'
import { useApp } from '../store/AppContext'
import SkillCard from '../components/SkillCard'

export default function FavoritesPage() {
  const { state, dispatch, toast } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const favoriteSkills = useMemo(
    () => state.skills.filter((s) => state.favorites.includes(s.id)),
    [state.skills, state.favorites],
  )

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

  return (
    <div className="fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">我的收藏</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {state.favorites.length} 个技能已收藏
            </p>
          </div>
          {state.favorites.length > 0 && (
            <div className="flex gap-2">
              <button onClick={exportFavorites} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-sm cursor-pointer transition-colors">
                <Download className="w-4 h-4" />导出
              </button>
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-sm cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />导入
                <input ref={fileRef} type="file" accept=".json" onChange={importFavorites} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {favoriteSkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteSkills.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Heart className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">还没有收藏任何技能</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">去技能市场发现感兴趣的技能吧</p>
            <button onClick={() => dispatch({ type: 'SET_TAB', tab: 'market' })} className="px-6 py-3 rounded-xl bg-primary text-white cursor-pointer hover:bg-primary-dark transition-colors">
              去逛逛
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
