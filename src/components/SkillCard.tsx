import { Star, Download } from 'lucide-react'
import { type Skill, CAT_COLORS } from '../data/skills'
import { useApp } from '../store/AppContext'
import { formatNum } from '../utils'

interface Props {
  skill: Skill
}

export default function SkillCard({ skill }: Props) {
  const { openDetail, toggleFavorite, isFavorite } = useApp()
  const fav = isFavorite(skill.id)

  return (
    <div
      onClick={() => openDetail(skill)}
      className="group relative glass-elevated glass-hover rounded-2xl p-5 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-lg"
            style={{ background: `linear-gradient(135deg, ${skill.color || '#6366F1'}, ${skill.color || '#6366F1'}CC)` }}
          >
            {skill.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate text-heading group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
              {skill.name}
            </h3>
            <p className="text-xs text-gray-400 truncate">@{skill.author}</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(skill)
          }}
          className={`p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer shrink-0 ${
            fav ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'
          }`}
        >
          <svg
            className="w-4 h-4"
            fill={fav ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
        {skill.description}
      </p>

      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
            CAT_COLORS[skill.category] ||
            'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
          }`}
        >
          {skill.category}
        </span>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3" fill="currentColor" />
            {formatNum(skill.stars)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {formatNum(skill.downloads)}
          </span>
        </div>
      </div>
    </div>
  )
}
