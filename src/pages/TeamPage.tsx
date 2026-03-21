import { useState, useCallback } from 'react'
import { Search, RefreshCw, Users, Package, Copy, Check, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { type TeamSkill, type SkillBundle, type TeamRepo, CAT_COLORS, CATEGORIES, pickColor } from '../data/skills'
import { fetchTeamIndex, fetchTeamBundles } from '../services/github'
import { GitLabService } from '../services/gitlab'
import { GiteeService } from '../services/gitee'
import { DEFAULT_WEB_URLS, type GitProviderType } from '../services/git-provider'
import { copyToClipboard } from '../utils'
import SkillCard from '../components/SkillCard'

export default function TeamPage() {
  const { state, dispatch, toast } = useApp()
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchRepoData = async (repo: TeamRepo) => {
    const token = state.githubToken && state.gitProviderType === repo.platform ? state.githubToken : null
    const webUrl = DEFAULT_WEB_URLS[repo.platform]

    if (repo.platform === 'github') {
      const [metas, bundles] = await Promise.all([
        fetchTeamIndex(repo.owner, repo.repo, token),
        fetchTeamBundles(repo.owner, repo.repo, token),
      ])
      return { metas, bundles, webUrl }
    }

    if (repo.platform === 'gitlab') {
      if (token) {
        const svc = new GitLabService(token)
        const [indexRes, bundles] = await Promise.all([
          svc.readRepoIndex(repo.owner, repo.repo),
          svc.readRepoBundles(repo.owner, repo.repo),
        ])
        return { metas: indexRes?.data || [], bundles, webUrl }
      }
      const indexFile = await GitLabService.readPublicRepoFile('https://gitlab.com', repo.owner, repo.repo, '.skill-hub/index.json')
      const bundleFile = await GitLabService.readPublicRepoFile('https://gitlab.com', repo.owner, repo.repo, '.skill-hub/bundles.json')
      return {
        metas: indexFile ? JSON.parse(indexFile.content) : [],
        bundles: bundleFile ? JSON.parse(bundleFile.content) : [],
        webUrl,
      }
    }

    if (repo.platform === 'gitee') {
      if (token) {
        const svc = new GiteeService(token)
        const [indexRes, bundles] = await Promise.all([
          svc.readRepoIndex(repo.owner, repo.repo),
          svc.readRepoBundles(repo.owner, repo.repo),
        ])
        return { metas: indexRes?.data || [], bundles, webUrl }
      }
      const indexFile = await GiteeService.readPublicRepoFile('', repo.owner, repo.repo, '.skill-hub/index.json')
      const bundleFile = await GiteeService.readPublicRepoFile('', repo.owner, repo.repo, '.skill-hub/bundles.json')
      return {
        metas: indexFile ? JSON.parse(indexFile.content) : [],
        bundles: bundleFile ? JSON.parse(bundleFile.content) : [],
        webUrl,
      }
    }

    return { metas: [], bundles: [], webUrl }
  }

  const syncTeamRepos = useCallback(async () => {
    if (state.teamRepos.length === 0) return
    dispatch({ type: 'SET_TEAM_SYNC_STATUS', status: 'syncing', message: '正在同步团队技能...' })

    try {
      const allSkills: TeamSkill[] = []
      const allBundles: SkillBundle[] = []

      for (const repo of state.teamRepos) {
        const { metas, bundles, webUrl } = await fetchRepoData(repo)

        for (const meta of metas) {
          allSkills.push({
            id: `${repo.id}--${meta.id}`,
            name: meta.name,
            author: meta.author,
            description: meta.description,
            category: meta.category,
            tags: meta.tags,
            stars: 0,
            downloads: 0,
            version: meta.version,
            color: meta.color || pickColor(allSkills.length),
            installCommand: `git clone ${webUrl}/${repo.owner}/${repo.repo}.git ~/.cursor/skills-team/${repo.repo} && cd ~/.cursor/skills-team/${repo.repo}/skills/${meta.name}`,
            updatedAt: meta.updatedAt,
            repoId: repo.id,
            repoLabel: repo.label,
            repoOwner: repo.owner,
            repoName: repo.repo,
          })
        }

        for (const bundle of bundles) {
          allBundles.push({ ...bundle, id: `${repo.id}--${bundle.id}` })
        }

        dispatch({
          type: 'UPDATE_TEAM_REPO',
          repo: { ...repo, lastSynced: new Date().toISOString() },
        })
      }

      dispatch({ type: 'SET_TEAM_SKILLS', skills: allSkills })
      dispatch({ type: 'SET_TEAM_BUNDLES', bundles: allBundles })
      dispatch({ type: 'SET_TEAM_SYNC_STATUS', status: 'idle' })
      toast(`同步完成，共 ${allSkills.length} 个技能`)
    } catch (err) {
      dispatch({ type: 'SET_TEAM_SYNC_STATUS', status: 'error', message: String(err) })
      toast('同步失败: ' + String(err))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.teamRepos, state.githubToken, state.gitProviderType, dispatch, toast])

  const handleCopyInstall = async (command: string, id: string) => {
    const ok = await copyToClipboard(command)
    if (ok) {
      setCopiedId(id)
      toast('已复制安装命令')
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const getBundleInstallCommand = (bundle: SkillBundle) => {
    const repoId = bundle.id.split('--')[0]
    const repo = state.teamRepos.find((r) => r.id === repoId)
    if (!repo) return ''
    const webUrl = DEFAULT_WEB_URLS[repo.platform]
    const commands = bundle.skillNames.map(
      (name) => `# ${name}\ngit clone ${webUrl}/${repo.owner}/${repo.repo}.git ~/.cursor/skills-team/${repo.repo} 2>/dev/null; cp -r ~/.cursor/skills-team/${repo.repo}/skills/${name} ~/.cursor/skills/${name}`
    )
    return commands.join('\n\n')
  }

  const filtered = state.teamSkills.filter((s) => {
    if (selectedRepo !== 'all' && s.repoId !== selectedRepo) return false
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  const usedCategories = [...new Set(state.teamSkills.map((s) => s.category))]

  if (state.teamRepos.length === 0) {
    return (
      <div className="fade-in">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-20 h-20 rounded-2xl glass-icon flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-primary dark:text-primary-light" />
          </div>
          <h2 className="text-2xl font-bold mb-3">尚未订阅团队仓库</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            订阅 GitHub 仓库作为团队技能源，让团队成员共享高质量的 Cursor 技能。
            <br />
            支持公开仓库（无需 Token）和私有仓库（使用 Token）。
          </p>
          <button
            onClick={() => dispatch({ type: 'SET_TAB', tab: 'settings' })}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/90 backdrop-blur-sm text-white font-medium cursor-pointer hover:bg-primary transition-all shadow-lg shadow-primary/20"
          >
            <Settings className="w-4 h-4" />
            前往设置添加团队仓库
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              团队技能
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              已订阅 {state.teamRepos.length} 个仓库，共 {state.teamSkills.length} 个技能
            </p>
          </div>
          <button
            onClick={syncTeamRepos}
            disabled={state.teamSyncStatus === 'syncing'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/90 backdrop-blur-sm text-white text-sm font-medium cursor-pointer hover:bg-primary transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${state.teamSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            {state.teamSyncStatus === 'syncing' ? '同步中...' : '同步所有仓库'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索团队技能..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-subtle text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="px-4 py-2.5 rounded-2xl glass-subtle text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">所有仓库</option>
            {state.teamRepos.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 rounded-2xl glass-subtle text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">所有分类</option>
            {CATEGORIES.filter((c) => usedCategories.includes(c)).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Bundles Section */}
        {state.teamBundles.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-primary" />
              技能集合
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.teamBundles.map((bundle) => {
                const isExpanded = expandedBundle === bundle.id
                const bundleSkills = bundle.skillNames
                  .map((name) => state.teamSkills.find((s) => s.name === name))
                  .filter(Boolean)
                const installCmd = getBundleInstallCommand(bundle)

                return (
                  <div
                    key={bundle.id}
                    className="glass-elevated rounded-2xl overflow-hidden transition-all duration-300 glass-hover"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl glass-icon flex items-center justify-center">
                            <Package className="w-4 h-4 text-primary dark:text-primary-light" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{bundle.name}</h4>
                            <p className="text-xs text-gray-400">@{bundle.author}</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light font-medium">
                          {bundle.skillNames.length} 个技能
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                        {bundle.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {bundleSkills.slice(0, 4).map((s) => (
                          <span
                            key={s!.id}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[s!.category] || 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'}`}
                          >
                            {s!.name}
                          </span>
                        ))}
                        {bundle.skillNames.length > 4 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500">
                            +{bundle.skillNames.length - 4}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setExpandedBundle(isExpanded ? null : bundle.id)}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl glass-subtle text-xs font-medium cursor-pointer hover:bg-white/40 dark:hover:bg-white/10 transition-all"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? '收起' : '展开'}
                        </button>
                        <button
                          onClick={() => handleCopyInstall(installCmd, bundle.id)}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-primary/90 backdrop-blur-sm text-white text-xs font-medium cursor-pointer hover:bg-primary transition-all shadow-md shadow-primary/20"
                        >
                          {copiedId === bundle.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedId === bundle.id ? '已复制' : '批量安装'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-white/20 dark:border-white/8 p-4 bg-white/20 dark:bg-white/[0.02] space-y-2">
                        {bundle.skillNames.map((name) => {
                          const s = state.teamSkills.find((sk) => sk.name === name)
                          return (
                            <div
                              key={name}
                              className="flex items-center justify-between py-2 px-3 rounded-xl glass-subtle"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {s && (
                                  <div
                                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                    style={{ background: s.color }}
                                  >
                                    {s.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-sm font-medium truncate">{name}</span>
                              </div>
                              {s && (
                                <button
                                  onClick={() => handleCopyInstall(s.installCommand, s.id)}
                                  className="p-1 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 cursor-pointer transition-all shrink-0"
                                >
                                  {copiedId === s.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Skills Grid */}
        {filtered.length > 0 ? (
          <>
            <h3 className="text-lg font-semibold mb-4">
              全部技能
              <span className="text-sm font-normal text-gray-400 ml-2">{filtered.length} 个</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((skill) => (
                <div key={skill.id} className="relative">
                  <SkillCard skill={skill} />
                  <span className="absolute top-3 right-12 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-medium">
                    {skill.repoLabel}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : state.teamSkills.length === 0 ? (
          <div className="text-center py-16">
            <RefreshCw className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">尚未同步团队技能</p>
            <button
              onClick={syncTeamRepos}
              disabled={state.teamSyncStatus === 'syncing'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/90 backdrop-blur-sm text-white text-sm font-medium cursor-pointer hover:bg-primary transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${state.teamSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              立即同步
            </button>
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">没有找到匹配的技能</p>
          </div>
        )}
      </div>
    </div>
  )
}
