import {
  Zap, Store, Heart, DownloadCloud, Settings,
  BarChart3, Clock, Sun, Moon, FolderEdit, RefreshCw, Users,
} from 'lucide-react'
import { useApp, type TabId } from '../store/AppContext'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  store: Store,
  heart: Heart,
  'download-cloud': DownloadCloud,
  settings: Settings,
  'bar-chart-3': BarChart3,
  clock: Clock,
  'folder-edit': FolderEdit,
  users: Users,
}

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'market', icon: 'store', label: '技能市场' },
  { id: 'myskills', icon: 'folder-edit', label: '我的技能' },
  { id: 'team', icon: 'users', label: '团队技能' },
  { id: 'favorites', icon: 'heart', label: '我的收藏' },
  { id: 'install', icon: 'download-cloud', label: '安装指南' },
  { id: 'dashboard', icon: 'bar-chart-3', label: '数据看板' },
  { id: 'recent', icon: 'clock', label: '最近浏览' },
  { id: 'settings', icon: 'settings', label: '设置' },
]

export default function Sidebar() {
  const { state, dispatch } = useApp()

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark')
    dispatch({ type: 'SET_THEME', theme: isDark ? 'light' : 'dark' })
  }

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 rounded-2xl glass-elevated">
      <div className="p-6 border-b border-white/20 dark:border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl glass-icon flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary dark:text-primary-light" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary dark:text-primary-light font-mono">
              Skill Hub
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">技能管理中心</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {TABS.map((tab) => {
          const Icon = ICON_MAP[tab.icon]
          const active = state.currentTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer text-left transition-colors duration-200 ${
                active
                  ? 'bg-white/30 dark:bg-white/[0.06] border-white/35 dark:border-white/[0.08] text-primary dark:text-primary-light shadow-sm backdrop-blur-sm'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-white/5'
              }`}
            >
              {Icon && <Icon className="w-5 h-5 shrink-0" />}
              <span className="font-medium text-sm">{tab.label}</span>
              {tab.id === 'favorites' && state.favorites.length > 0 && (
                <span className="ml-auto bg-primary/20 text-primary dark:text-primary-light text-xs font-bold px-2 py-0.5 rounded-full">
                  {state.favorites.length}
                </span>
              )}
              {tab.id === 'myskills' && state.mySkills.length > 0 && (
                <span className="ml-auto bg-primary/20 text-primary dark:text-primary-light text-xs font-bold px-2 py-0.5 rounded-full">
                  {state.mySkills.length}
                </span>
              )}
              {tab.id === 'team' && state.teamSkills.length > 0 && (
                <span className="ml-auto bg-primary/20 text-primary dark:text-primary-light text-xs font-bold px-2 py-0.5 rounded-full">
                  {state.teamSkills.length}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Sync & Auth Footer */}
      <div className="p-4 border-t border-white/20 dark:border-white/8 space-y-3">
        {state.githubUser && (
          <div className="flex items-center gap-2 px-2">
            <img
              src={state.githubUser.avatar_url}
              alt=""
              className="w-6 h-6 rounded-full"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {state.githubUser.login}
            </span>
            {state.syncStatus === 'syncing' && (
              <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin ml-auto shrink-0" />
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-white/30 dark:hover:bg-white/10 cursor-pointer transition-all duration-200"
            title="切换主题"
          >
            {state.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  )
}

export { TABS, ICON_MAP }
