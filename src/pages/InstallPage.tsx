import { useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { copyToClipboard } from '../utils'

export default function InstallPage() {
  const { state, toast } = useApp()
  const [platform, setPlatform] = useState('Windows')
  const [copiedCmd, setCopiedCmd] = useState('')

  const isWin = platform === 'Windows'
  const isMac = platform === 'macOS'

  const steps = useMemo(() => [
    { title: '安装 Cursor 编辑器', desc: '从官网下载并安装最新版 Cursor 编辑器', command: isWin ? 'winget install Anysphere.Cursor' : isMac ? 'brew install --cask cursor' : 'sudo snap install cursor --classic' },
    { title: '打开技能目录', desc: '在 Cursor 中创建或打开技能存放目录', command: isWin ? 'mkdir %USERPROFILE%\\.cursor\\skills' : 'mkdir -p ~/.cursor/skills' },
    { title: '安装技能', desc: '使用以下命令克隆技能到本地', command: `git clone https://github.com/author/skill-name.git ${isWin ? '%USERPROFILE%\\.cursor\\skills\\skill-name' : '~/.cursor/skills/skill-name'}` },
    { title: '配置技能路径', desc: '在 Cursor 设置中添加技能目录路径', command: null },
  ], [isWin, isMac])

  const favoriteSkills = useMemo(
    () => state.skills.filter((s) => state.favorites.includes(s.id)),
    [state.skills, state.favorites],
  )

  const batchCommand = useMemo(() => {
    const base = isWin ? '%USERPROFILE%\\.cursor\\skills' : '~/.cursor/skills'
    return favoriteSkills.map((s) => `git clone https://github.com/${s.author}/${s.name}.git ${base}/${s.name}`).join(isWin ? ' && ' : ' && \\\n')
  }, [favoriteSkills, isWin])

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text)
    if (ok) { setCopiedCmd(text); toast('已复制到剪贴板'); setTimeout(() => setCopiedCmd(''), 2000) }
  }

  return (
    <div className="fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-2">安装指南</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">按照以下步骤快速安装和配置技能</p>

        <div className="flex gap-2 mb-6">
          {['Windows', 'macOS', 'Linux'].map((p) => (
            <button key={p} onClick={() => setPlatform(p)} className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${platform === p ? 'bg-primary text-white' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10'}`}>
              {p}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div key={idx} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light flex items-center justify-center text-sm font-bold">{idx + 1}</div>
                <h3 className="font-semibold">{step.title}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{step.desc}</p>
              {step.command && (
                <div className="relative group/code">
                  <pre className="bg-gray-900 dark:bg-black/40 text-green-400 rounded-xl p-4 text-sm font-mono overflow-x-auto"><code>{step.command}</code></pre>
                  <button onClick={() => handleCopy(step.command!)} className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white cursor-pointer transition-all opacity-0 group-hover/code:opacity-100">
                    {copiedCmd === step.command ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {favoriteSkills.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-bold mb-4">批量安装收藏的技能</h3>
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">一键复制以下命令安装所有收藏的技能</p>
              <div className="relative group/code">
                <pre className="bg-gray-900 dark:bg-black/40 text-green-400 rounded-xl p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap"><code>{batchCommand}</code></pre>
                <button onClick={() => handleCopy(batchCommand)} className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white cursor-pointer transition-all opacity-0 group-hover/code:opacity-100">
                  {copiedCmd === batchCommand ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
