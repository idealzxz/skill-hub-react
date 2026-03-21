import { useMemo, useState } from 'react'
import { Search, SearchX, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { CATEGORIES } from '../data/skills'
import SkillCard from '../components/SkillCard'

const POPULAR_TAGS = ['AI', 'React', 'DevOps', 'TypeScript', 'Tailwind', 'Python']

export default function MarketPage() {
  const { state } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 12

  const filteredSkills = useMemo(() => {
    let result = [...state.skills]
    if (selectedCategory !== 'all') {
      result = result.filter((s) => s.category === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.author.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          s.category.toLowerCase().includes(q),
      )
    }
    if (sortBy === 'popular') result.sort((a, b) => b.stars - a.stars)
    else if (sortBy === 'newest')
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [state.skills, selectedCategory, searchQuery, sortBy])

  const totalPages = Math.ceil(filteredSkills.length / perPage)
  const paginatedSkills = filteredSkills.slice((currentPage - 1) * perPage, currentPage * perPage)

  const visiblePages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | string)[] = [1]
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++)
      pages.push(i)
    if (currentPage < totalPages - 2) pages.push('...')
    if (totalPages > 1) pages.push(totalPages)
    return pages
  }, [totalPages, currentPage])

  const handleSearch = (q: string) => { setSearchQuery(q); setCurrentPage(1) }
  const handleCategoryChange = (cat: string) => { setSelectedCategory(cat); setCurrentPage(1) }

  return (
    <div className="fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              发现 67,000+ 优质技能
            </span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
            浏览、搜索和管理 Cursor 技能，提升你的开发效率
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              data-search-input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索技能名称、作者、标签..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl glass-elevated text-heading placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="text-xs text-gray-400">热门搜索:</span>
            {POPULAR_TAGS.map((tag) => (
              <button key={tag} onClick={() => handleSearch(tag)} className="text-xs px-3 py-1 rounded-full glass-subtle text-primary dark:text-primary-light hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer transition-all">
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {['all', ...CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => handleCategoryChange(cat)} className={`px-4 py-2 rounded-2xl text-sm font-medium cursor-pointer transition-all duration-300 ${selectedCategory === cat ? 'bg-primary/90 backdrop-blur-sm text-white shadow-lg shadow-primary/20 border border-transparent' : 'glass-subtle text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'}`}>
              {cat === 'all' ? '全部' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            找到 <span className="font-bold text-primary dark:text-primary-light">{filteredSkills.length}</span> 个技能
          </p>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm px-3 py-1.5 rounded-xl glass-subtle cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="popular">按热度</option>
            <option value="newest">按最新</option>
            <option value="name">按名称</option>
          </select>
        </div>

        {paginatedSkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <SearchX className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">没有找到匹配的技能</p>
            <button onClick={() => { setSearchQuery(''); setSelectedCategory('all') }} className="mt-4 px-6 py-2.5 rounded-2xl bg-primary/90 backdrop-blur-sm text-white cursor-pointer hover:bg-primary transition-all shadow-lg shadow-primary/20">
              清除搜索
            </button>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-2 rounded-xl glass-subtle hover:bg-white/50 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {visiblePages.map((p, i) => (
              <button key={i} onClick={() => typeof p === 'number' && setCurrentPage(p)} disabled={p === '...'} className={`w-10 h-10 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 ${p === currentPage ? 'bg-primary/90 backdrop-blur-sm text-white shadow-lg shadow-primary/20 border border-transparent' : 'glass-subtle hover:bg-white/50 dark:hover:bg-white/10'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-2 rounded-xl glass-subtle hover:bg-white/50 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
