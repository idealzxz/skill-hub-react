import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react'
import { generateDemoSkills, type Skill, type UserSkill, type SkillMeta, type TeamRepo, type TeamSkill, type SkillBundle } from '../data/skills'
import { GitHubService, type GitHubUser } from '../services/github'
import { GitLabService } from '../services/gitlab'
import { GiteeService } from '../services/gitee'
import type { GitProvider, GitProviderType } from '../services/git-provider'

export type TabId = 'market' | 'favorites' | 'install' | 'settings' | 'dashboard' | 'recent' | 'myskills' | 'editor' | 'team'
type Theme = 'light' | 'dark' | 'system'

interface RecentView {
  skillId: string
  viewedAt: string
}

export interface AppState {
  currentTab: TabId
  theme: Theme
  skills: Skill[]
  favorites: string[]
  recentViews: RecentView[]
  toasts: { id: number; msg: string }[]
  detailSkill: Skill | null
  githubToken: string | null
  githubUser: GitHubUser | null
  gitProviderType: GitProviderType
  mySkills: UserSkill[]
  editingSkill: UserSkill | null
  syncStatus: 'idle' | 'syncing' | 'error'
  syncMessage: string
  indexSha?: string
  favSha?: string
  teamRepos: TeamRepo[]
  teamSkills: TeamSkill[]
  teamBundles: SkillBundle[]
  teamSyncStatus: 'idle' | 'syncing' | 'error'
  teamSyncMessage: string
}

export type Action =
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'SET_SKILLS'; skills: Skill[] }
  | { type: 'TOGGLE_FAVORITE'; skillId: string }
  | { type: 'SET_FAVORITES'; favorites: string[] }
  | { type: 'ADD_RECENT'; skillId: string }
  | { type: 'CLEAR_RECENT' }
  | { type: 'ADD_TOAST'; msg: string; id: number }
  | { type: 'REMOVE_TOAST'; id: number }
  | { type: 'SET_DETAIL'; skill: Skill | null }
  | { type: 'SET_GITHUB_AUTH'; token: string | null; user: GitHubUser | null; providerType?: GitProviderType }
  | { type: 'SET_MY_SKILLS'; skills: UserSkill[] }
  | { type: 'ADD_MY_SKILL'; skill: UserSkill }
  | { type: 'UPDATE_MY_SKILL'; skill: UserSkill }
  | { type: 'DELETE_MY_SKILL'; skillId: string }
  | { type: 'SET_EDITING_SKILL'; skill: UserSkill | null }
  | { type: 'SET_SYNC_STATUS'; status: 'idle' | 'syncing' | 'error'; message?: string }
  | { type: 'SET_INDEX_SHA'; sha: string }
  | { type: 'SET_FAV_SHA'; sha: string }
  | { type: 'SET_TEAM_REPOS'; repos: TeamRepo[] }
  | { type: 'ADD_TEAM_REPO'; repo: TeamRepo }
  | { type: 'REMOVE_TEAM_REPO'; repoId: string }
  | { type: 'UPDATE_TEAM_REPO'; repo: TeamRepo }
  | { type: 'SET_TEAM_SKILLS'; skills: TeamSkill[] }
  | { type: 'SET_TEAM_BUNDLES'; bundles: SkillBundle[] }
  | { type: 'SET_TEAM_SYNC_STATUS'; status: 'idle' | 'syncing' | 'error'; message?: string }
  | { type: 'CLEAR_ALL' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, currentTab: action.tab }
    case 'SET_THEME':
      return { ...state, theme: action.theme }
    case 'SET_SKILLS':
      return { ...state, skills: action.skills }
    case 'TOGGLE_FAVORITE': {
      const idx = state.favorites.indexOf(action.skillId)
      const next = idx > -1
        ? state.favorites.filter((id) => id !== action.skillId)
        : [...state.favorites, action.skillId]
      return { ...state, favorites: next }
    }
    case 'SET_FAVORITES':
      return { ...state, favorites: action.favorites }
    case 'ADD_RECENT': {
      const filtered = state.recentViews.filter((v) => v.skillId !== action.skillId)
      return {
        ...state,
        recentViews: [
          { skillId: action.skillId, viewedAt: new Date().toISOString() },
          ...filtered,
        ].slice(0, 20),
      }
    }
    case 'CLEAR_RECENT':
      return { ...state, recentViews: [] }
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { id: action.id, msg: action.msg }] }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'SET_DETAIL':
      return { ...state, detailSkill: action.skill }
    case 'SET_GITHUB_AUTH':
      return { ...state, githubToken: action.token, githubUser: action.user, gitProviderType: action.providerType || state.gitProviderType }
    case 'SET_MY_SKILLS':
      return { ...state, mySkills: action.skills }
    case 'ADD_MY_SKILL':
      return { ...state, mySkills: [...state.mySkills, action.skill] }
    case 'UPDATE_MY_SKILL':
      return {
        ...state,
        mySkills: state.mySkills.map((s) => (s.id === action.skill.id ? action.skill : s)),
      }
    case 'DELETE_MY_SKILL':
      return {
        ...state,
        mySkills: state.mySkills.filter((s) => s.id !== action.skillId),
      }
    case 'SET_EDITING_SKILL':
      return { ...state, editingSkill: action.skill }
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.status, syncMessage: action.message || '' }
    case 'SET_INDEX_SHA':
      return { ...state, indexSha: action.sha }
    case 'SET_FAV_SHA':
      return { ...state, favSha: action.sha }
    case 'SET_TEAM_REPOS':
      return { ...state, teamRepos: action.repos }
    case 'ADD_TEAM_REPO':
      return { ...state, teamRepos: [...state.teamRepos, action.repo] }
    case 'REMOVE_TEAM_REPO':
      return { ...state, teamRepos: state.teamRepos.filter((r) => r.id !== action.repoId) }
    case 'UPDATE_TEAM_REPO':
      return {
        ...state,
        teamRepos: state.teamRepos.map((r) => (r.id === action.repo.id ? action.repo : r)),
      }
    case 'SET_TEAM_SKILLS':
      return { ...state, teamSkills: action.skills }
    case 'SET_TEAM_BUNDLES':
      return { ...state, teamBundles: action.bundles }
    case 'SET_TEAM_SYNC_STATUS':
      return { ...state, teamSyncStatus: action.status, teamSyncMessage: action.message || '' }
    case 'CLEAR_ALL':
      return {
        ...state,
        favorites: [],
        recentViews: [],
        mySkills: [],
        theme: 'light',
        githubToken: null,
        githubUser: null,
        gitProviderType: 'github',
        indexSha: undefined,
        favSha: undefined,
        teamRepos: [],
        teamSkills: [],
        teamBundles: [],
      }
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  toast: (msg: string) => void
  toggleFavorite: (skill: Skill) => void
  isFavorite: (id: string) => boolean
  openDetail: (skill: Skill) => void
  closeDetail: () => void
  getGitHub: () => GitHubService | null
  getProvider: () => GitProvider | null
  getMetas: () => SkillMeta[]
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

function loadInitialState(): AppState {
  return {
    currentTab: 'market',
    theme: (localStorage.getItem('sh_theme') as Theme) || 'light',
    skills: generateDemoSkills(),
    favorites: JSON.parse(localStorage.getItem('sh_favorites') || '[]'),
    recentViews: JSON.parse(localStorage.getItem('sh_recent') || '[]'),
    toasts: [],
    detailSkill: null,
    githubToken: localStorage.getItem('sh_github_token'),
    githubUser: JSON.parse(localStorage.getItem('sh_github_user') || 'null'),
    gitProviderType: (localStorage.getItem('sh_git_provider') as GitProviderType) || 'github',
    mySkills: JSON.parse(localStorage.getItem('sh_my_skills') || '[]'),
    editingSkill: null,
    syncStatus: 'idle',
    syncMessage: '',
    indexSha: undefined,
    favSha: undefined,
    teamRepos: JSON.parse(localStorage.getItem('sh_team_repos') || '[]'),
    teamSkills: [],
    teamBundles: [],
    teamSyncStatus: 'idle',
    teamSyncMessage: '',
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadInitialState)

  let toastId = 0
  const toast = useCallback((msg: string) => {
    const id = ++toastId
    dispatch({ type: 'ADD_TOAST', msg, id })
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id }), 2500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleFavorite = useCallback((skill: Skill) => {
    dispatch({ type: 'TOGGLE_FAVORITE', skillId: skill.id })
  }, [])

  const isFavorite = useCallback(
    (id: string) => state.favorites.includes(id),
    [state.favorites],
  )

  const openDetail = useCallback((skill: Skill) => {
    dispatch({ type: 'SET_DETAIL', skill })
    dispatch({ type: 'ADD_RECENT', skillId: skill.id })
  }, [])

  const closeDetail = useCallback(() => dispatch({ type: 'SET_DETAIL', skill: null }), [])

  const getGitHub = useCallback(() => {
    if (!state.githubToken) return null
    return new GitHubService(state.githubToken)
  }, [state.githubToken])

  const getProvider = useCallback((): GitProvider | null => {
    if (!state.githubToken) return null
    switch (state.gitProviderType) {
      case 'gitlab': return new GitLabService(state.githubToken)
      case 'gitee': return new GiteeService(state.githubToken)
      default: return new GitHubService(state.githubToken)
    }
  }, [state.githubToken, state.gitProviderType])

  const getMetas = useCallback((): SkillMeta[] => {
    return state.mySkills.map((s) => ({
      id: s.id,
      name: s.name,
      author: s.author,
      description: s.description,
      category: s.category,
      tags: s.tags,
      version: s.version,
      color: s.color,
      createdAt: s.updatedAt,
      updatedAt: s.updatedAt,
    }))
  }, [state.mySkills])

  useEffect(() => {
    localStorage.setItem('sh_favorites', JSON.stringify(state.favorites))
  }, [state.favorites])

  useEffect(() => {
    localStorage.setItem('sh_recent', JSON.stringify(state.recentViews))
  }, [state.recentViews])

  useEffect(() => {
    localStorage.setItem('sh_theme', state.theme)
    const isDark =
      state.theme === 'dark' ||
      (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  }, [state.theme])

  useEffect(() => {
    if (state.githubToken) localStorage.setItem('sh_github_token', state.githubToken)
    else localStorage.removeItem('sh_github_token')
  }, [state.githubToken])

  useEffect(() => {
    if (state.githubUser) localStorage.setItem('sh_github_user', JSON.stringify(state.githubUser))
    else localStorage.removeItem('sh_github_user')
  }, [state.githubUser])

  useEffect(() => {
    localStorage.setItem('sh_git_provider', state.gitProviderType)
  }, [state.gitProviderType])

  useEffect(() => {
    localStorage.setItem('sh_my_skills', JSON.stringify(state.mySkills))
  }, [state.mySkills])

  useEffect(() => {
    localStorage.setItem('sh_team_repos', JSON.stringify(state.teamRepos))
  }, [state.teamRepos])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}clawhub-skills.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data.skills) && data.skills.length > 0) {
          dispatch({ type: 'SET_SKILLS', skills: data.skills })
        }
      })
      .catch(() => {/* 保留 generateDemoSkills 作为回退 */})
  }, [])

  return (
    <AppContext.Provider
      value={{ state, dispatch, toast, toggleFavorite, isFavorite, openDetail, closeDetail, getGitHub, getProvider, getMetas }}
    >
      {children}
    </AppContext.Provider>
  )
}
