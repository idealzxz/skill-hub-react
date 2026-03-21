import { useApp } from './store/AppContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import SkillDetailModal from './components/SkillDetailModal'
import Toast from './components/Toast'
import MarketPage from './pages/MarketPage'
import FavoritesPage from './pages/FavoritesPage'
import InstallPage from './pages/InstallPage'
import SettingsPage from './pages/SettingsPage'
import DashboardPage from './pages/DashboardPage'
import RecentPage from './pages/RecentPage'
import MySkillsPage from './pages/MySkillsPage'
import TeamPage from './pages/TeamPage'
import SkillEditorPage from './pages/SkillEditorPage'

function AppContent() {
  const { state } = useApp()
  useKeyboardShortcuts()

  const renderPage = () => {
    switch (state.currentTab) {
      case 'market': return <MarketPage />
      case 'favorites': return <FavoritesPage />
      case 'install': return <InstallPage />
      case 'settings': return <SettingsPage />
      case 'dashboard': return <DashboardPage />
      case 'recent': return <RecentPage />
      case 'myskills': return <MySkillsPage />
      case 'team': return <TeamPage />
      case 'editor': return <SkillEditorPage />
      default: return <MarketPage />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden liquid-bg text-body font-sans transition-colors duration-500 p-0 md:p-3 gap-0 md:gap-3">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <MobileNav />
        <div className="flex-1 overflow-y-auto">{renderPage()}</div>
      </main>
      <SkillDetailModal />
      <Toast />
    </div>
  )
}

export default function App() {
  return <AppContent />
}
