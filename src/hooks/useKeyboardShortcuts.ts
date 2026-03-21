import { useEffect } from 'react'
import { useApp, type TabId } from '../store/AppContext'

export function useKeyboardShortcuts() {
  const { dispatch } = useApp()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        dispatch({ type: 'SET_TAB', tab: 'market' })
        setTimeout(() => {
          document.querySelector<HTMLInputElement>('[data-search-input]')?.focus()
        }, 100)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault()
        const isDark = document.documentElement.classList.contains('dark')
        dispatch({ type: 'SET_THEME', theme: isDark ? 'light' : 'dark' })
        return
      }

      if (e.altKey && e.key >= '1' && e.key <= '7') {
        e.preventDefault()
        const tabs: TabId[] = ['market', 'myskills', 'favorites', 'install', 'dashboard', 'recent', 'settings']
        const idx = parseInt(e.key) - 1
        if (tabs[idx]) dispatch({ type: 'SET_TAB', tab: tabs[idx] })
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dispatch])
}
