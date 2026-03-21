import { useMemo } from 'react'
import { Clock, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import SkillCard from '../components/SkillCard'

export default function RecentPage() {
  const { state, dispatch } = useApp()

  const recentSkills = useMemo(() => {
    return state.recentViews
      .map((rv) => {
        const skill = state.skills.find((s) => s.id === rv.skillId)
        return skill ? { ...skill, viewedAt: rv.viewedAt } : null
      })
      .filter(Boolean) as (typeof state.skills[0] & { viewedAt: string })[]
  }, [state.recentViews, state.skills])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins} 分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} 小时前`
    return `${Math.floor(hours / 24)} 天前`
  }

  return (
    <div className="fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">最近浏览</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{recentSkills.length} 个技能</p>
          </div>
          {recentSkills.length > 0 && (
            <button onClick={() => dispatch({ type: 'CLEAR_RECENT' })} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 text-sm cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-4 h-4" />清空历史
            </button>
          )}
        </div>

        {recentSkills.length > 0 ? (
          <div className="space-y-4">
            {recentSkills.map((skill) => (
              <div key={skill.id + skill.viewedAt}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">浏览于 {formatTime(skill.viewedAt)}</span>
                </div>
                <SkillCard skill={skill} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">还没有浏览过任何技能</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">去技能市场看看吧</p>
            <button onClick={() => dispatch({ type: 'SET_TAB', tab: 'market' })} className="px-6 py-3 rounded-xl bg-primary text-white cursor-pointer hover:bg-primary-dark transition-colors">
              去逛逛
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
