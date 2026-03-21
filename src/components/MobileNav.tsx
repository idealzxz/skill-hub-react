import { Zap, Sun, Moon } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { TABS, ICON_MAP } from './Sidebar'

export default function MobileNav() {
  const { state, dispatch } = useApp()

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark')
    dispatch({ type: 'SET_THEME', theme: isDark ? 'light' : 'dark' })
  }

  const visibleTabs = TABS.filter((tab) =>
    ['market', 'myskills', 'team', 'favorites', 'settings'].includes(tab.id),
  )

  return (
    <>
      <header className="md:hidden flex items-center justify-between p-4 glass border-0 border-b border-white/20 dark:border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl glass-icon flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary dark:text-primary-light" />
          </div>
          <span className="font-bold text-primary dark:text-primary-light font-mono">
            Skill Hub
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-white/30 dark:hover:bg-white/10 cursor-pointer transition-all"
        >
          {state.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <nav className="md:hidden flex glass border-0 border-t border-white/20 dark:border-white/8">
        {visibleTabs.map((tab) => {
          const Icon = ICON_MAP[tab.icon]
          const active = state.currentTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
              className={`flex-1 flex flex-col items-center gap-1 py-3 cursor-pointer transition-colors relative ${
                active ? 'text-primary dark:text-primary-light' : 'text-gray-400'
              }`}
            >
              {Icon && <Icon className="w-5 h-5" />}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
