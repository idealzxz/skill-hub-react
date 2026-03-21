import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CAT_COLORS } from '../data/skills'
import { useApp } from '../store/AppContext'
import { formatNum, copyToClipboard } from '../utils'

export default function SkillDetailModal() {
  const { state, toast, toggleFavorite, isFavorite, closeDetail } = useApp()
  const skill = state.detailSkill
  const [copied, setCopied] = useState(false)

  const fav = skill ? isFavorite(skill.id) : false

  const handleCopy = async () => {
    if (!skill) return
    const ok = await copyToClipboard(skill.installCommand)
    if (ok) {
      setCopied(true)
      toast('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AnimatePresence>
      {skill && (
        <motion.div
          key="skill-backdrop"
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={closeDetail}
        />
      )}
      {skill && (
        <motion.div
          key="skill-panel-wrapper"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-lg glass-elevated rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto pointer-events-auto"
          >
            <div className="p-6 sm:p-8">
              <button
                onClick={closeDetail}
                className="absolute top-4 right-4 p-2 rounded-xl glass-subtle hover:bg-white/40 dark:hover:bg-white/10 cursor-pointer transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${skill.color || '#6366F1'}, ${skill.color || '#6366F1'}CC)` }}
                >
                  {skill.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{skill.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{skill.author}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${CAT_COLORS[skill.category] || 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'}`}>
                  {skill.category}
                </span>
                {skill.tags.map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                {skill.description}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-3 rounded-2xl glass-subtle">
                  <p className="text-lg font-bold text-primary dark:text-primary-light">{formatNum(skill.stars)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">星标</p>
                </div>
                <div className="text-center p-3 rounded-2xl glass-subtle">
                  <p className="text-lg font-bold text-primary dark:text-primary-light">{formatNum(skill.downloads)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">下载</p>
                </div>
                <div className="text-center p-3 rounded-2xl glass-subtle">
                  <p className="text-lg font-bold text-primary dark:text-primary-light">{skill.version}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">版本</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-2">安装命令</h4>
                <div className="relative group/code">
                  <pre className="bg-gray-900/90 dark:bg-black/60 backdrop-blur-sm text-green-400 rounded-2xl p-4 text-sm font-mono overflow-x-auto border border-white/5">
                    <code>{skill.installCommand}</code>
                  </pre>
                  <button onClick={handleCopy} className="absolute top-3 right-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white cursor-pointer transition-all opacity-0 group-hover/code:opacity-100">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => toggleFavorite(skill)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer transition-all duration-300 text-sm font-medium ${
                    fav
                      ? 'glass-subtle !bg-red-50/60 dark:!bg-red-500/10 text-red-500 !border-red-200/60 dark:!border-red-500/20'
                      : 'glass-subtle hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  <svg className="w-4 h-4" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {fav ? '取消收藏' : '收藏'}
                </button>
                <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/90 backdrop-blur-sm text-white cursor-pointer hover:bg-primary transition-all duration-300 text-sm font-medium shadow-lg shadow-primary/20">
                  <Copy className="w-4 h-4" />
                  复制命令
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
