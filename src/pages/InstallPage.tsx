import { useState, useMemo } from 'react'
import { Copy, Check, GitBranch, Heart } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { copyToClipboard, resolveFavoriteSkills } from '../utils'
import { type Platform, buildBatchInstallCommand } from '../utils/installCommands'

export default function InstallPage() {
  const { state, dispatch, toast } = useApp()
  const [platform, setPlatform] = useState<Platform>('Windows')
  const [copiedCmd, setCopiedCmd] = useState('')
  const isWin = platform === 'Windows'
  const isMac = platform === 'macOS'

  const steps = useMemo(() => [
    { title: '安装 Cursor 编辑器', desc: '从官网下载并安装最新版 Cursor 编辑器', command: isWin ? 'winget install Anysphere.Cursor' : isMac ? 'brew install --cask cursor' : 'sudo snap install cursor --classic' },
    { title: '准备技能目录', desc: '在终端创建 Cursor 技能目录（macOS / Linux）', command: isWin ? null : 'mkdir -p ~/.cursor/skills' },
    { title: '安装技能', desc: '使用 git clone（HTTPS）将公开技能仓库克隆到 ~/.cursor/skills/<技能名>', command: 'mkdir -p ~/.cursor/skills && git clone https://github.com/作者名/技能仓库.git ~/.cursor/skills/技能名' },
    { title: '配置技能路径', desc: '在 Cursor 设置中添加技能目录路径', command: null },
  ], [isWin, isMac])

  const favoriteSkills = useMemo(
    () => resolveFavoriteSkills(state.favorites, state.skills, state.mySkills, state.teamSkills),
    [state.favorites, state.skills, state.mySkills, state.teamSkills],
  )

  const batchCommand = useMemo(() => {
    return buildBatchInstallCommand(favoriteSkills, platform)
  }, [favoriteSkills, platform])

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text)
    if (ok) { setCopiedCmd(text); toast('已复制到剪贴板'); setTimeout(() => setCopiedCmd(''), 2000) }
  }

  return (
    <div className="fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-2">安装指南</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">使用 Git HTTPS 将公开技能仓库克隆到本地 Cursor 技能目录</p>

        <div className="flex gap-2 mb-6">
          {['Windows', 'macOS', 'Linux'].map((p) => (
            <button key={p} onClick={() => setPlatform(p as Platform)} className={`px-4 py-2 rounded-2xl text-sm font-medium cursor-pointer transition-all duration-300 ${platform === p ? 'bg-primary/90 backdrop-blur-sm text-white shadow-lg shadow-primary/20 border border-transparent' : 'glass-subtle text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'}`}>
              {p}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div key={idx} className="glass-elevated rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full glass-subtle text-primary dark:text-primary-light flex items-center justify-center text-sm font-bold">{idx + 1}</div>
                <h3 className="font-semibold">{step.title}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{step.desc}</p>
              {step.command && (
                <div className="relative group/code">
                  <pre className="bg-gray-900/90 dark:bg-black/60 backdrop-blur-sm text-green-400 rounded-2xl border border-white/5 p-4 text-sm font-mono overflow-x-auto"><code>{step.command}</code></pre>
                  <button onClick={() => handleCopy(step.command!)} className="absolute top-3 right-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white cursor-pointer transition-all opacity-0 group-hover/code:opacity-100">
                    {copiedCmd === step.command ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {favoriteSkills.length > 0 ? (
          <div className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-gray-400" />
                批量安装收藏的 {favoriteSkills.length} 个技能（HTTPS）
              </h3>
            </div>
            <div className="glass-elevated rounded-2xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">一键复制以下命令，用 Git 安装所有收藏的技能</p>
              <div className="relative group/code">
                <pre className="bg-gray-900/90 dark:bg-black/60 backdrop-blur-sm text-green-400 rounded-2xl border border-white/5 p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto"><code>{batchCommand}</code></pre>
                <button onClick={() => handleCopy(batchCommand)} className="absolute top-3 right-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white cursor-pointer transition-all opacity-0 group-hover/code:opacity-100">
                  {copiedCmd === batchCommand ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-10 glass-elevated rounded-2xl p-8 text-center">
            <Heart className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 mb-1">还没有收藏任何技能</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">在数据看板或团队技能中浏览技能并收藏后，可在此批量生成 Git 安装命令</p>
            <button
              onClick={() => dispatch({ type: 'SET_TAB', tab: 'dashboard' })}
              className="px-5 py-2.5 rounded-2xl bg-primary/90 backdrop-blur-sm text-white text-sm cursor-pointer hover:bg-primary transition-all shadow-lg shadow-primary/20"
            >
              打开数据看板
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
