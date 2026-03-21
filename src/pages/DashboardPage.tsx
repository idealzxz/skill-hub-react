import { useMemo } from 'react'
import { Star, Download, Package, TrendingUp } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { CATEGORIES } from '../data/skills'
import { formatNum } from '../utils'

export default function DashboardPage() {
  const { state } = useApp()

  const stats = useMemo(() => {
    const totalStars = state.skills.reduce((sum, s) => sum + s.stars, 0)
    const totalDownloads = state.skills.reduce((sum, s) => sum + s.downloads, 0)
    return { totalSkills: state.skills.length, totalStars, totalDownloads }
  }, [state.skills])

  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; stars: number; downloads: number }> = {}
    state.skills.forEach((s) => {
      if (!map[s.category]) map[s.category] = { count: 0, stars: 0, downloads: 0 }
      map[s.category].count++
      map[s.category].stars += s.stars
      map[s.category].downloads += s.downloads
    })
    return CATEGORIES.map((cat) => ({ category: cat, ...(map[cat] || { count: 0, stars: 0, downloads: 0 }) })).sort((a, b) => b.downloads - a.downloads)
  }, [state.skills])

  const topSkills = useMemo(() => [...state.skills].sort((a, b) => b.stars - a.stars).slice(0, 10), [state.skills])
  const maxDownloads = Math.max(...categoryStats.map((c) => c.downloads), 1)

  return (
    <div className="fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-8">数据看板</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center"><Package className="w-5 h-5 text-primary dark:text-primary-light" /></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">技能总数</span>
            </div>
            <p className="text-3xl font-bold text-primary dark:text-primary-light">{stats.totalSkills}</p>
          </div>
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center"><Star className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总星标数</span>
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{formatNum(stats.totalStars)}</p>
          </div>
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center"><Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总下载量</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatNum(stats.totalDownloads)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6"><TrendingUp className="w-5 h-5 text-primary dark:text-primary-light" /><h3 className="font-semibold">热门分类</h3></div>
            <div className="space-y-4">
              {categoryStats.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{cat.category}</span>
                    <span className="text-xs text-gray-400">{cat.count} 个技能 · {formatNum(cat.downloads)} 下载</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500" style={{ width: `${(cat.downloads / maxDownloads) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6"><Star className="w-5 h-5 text-amber-500" /><h3 className="font-semibold">最受欢迎技能</h3></div>
            <div className="space-y-3">
              {topSkills.map((skill, idx) => (
                <div key={skill.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx < 3 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: skill.color }}>{skill.name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{skill.name}</p><p className="text-xs text-gray-400">@{skill.author}</p></div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0"><Star className="w-3 h-3" fill="currentColor" />{formatNum(skill.stars)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
