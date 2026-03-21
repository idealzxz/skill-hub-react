/**
 * 从腾讯 SkillHub（ClawHub 国内镜像）拉取技能数据，输出到 public/clawhub-skills.json。
 * 供 GitHub Actions 定时执行，也可本地 `node scripts/fetch-clawhub.mjs` 手动跑。
 *
 * API 源: https://lightmake.site (skillhub.tencent.com 后端)
 * 优势: 国内高速镜像、中文描述、原生分类、分页接口更高效
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const API = 'https://lightmake.site/api'
const CLAWHUB_API = 'https://clawhub.ai/api'
const PAGE_SIZE = 100
const MAX_PAGES = 20
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── SkillHub 分类 → 可读名称映射 ─────────────────────────
const CATEGORY_MAP = {
  'developer-tools': 'DevOps',
  'ai-intelligence': 'AI & ML',
  'content-creation': 'UI/UX',
  'productivity': 'Automation',
  'security-compliance': 'Security',
  'data-analysis': 'Data Science',
  'office-collaboration': 'Documentation',
  'communication-collaboration': 'Documentation',
  'other': 'Automation',
}

const SKILL_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626',
  '#0891B2', '#DB2777', '#4F46E5', '#EA580C', '#0D9488',
]

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'use', 'when', 'that', 'this', 'from',
  'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'not', 'but', 'its', 'also', 'into', 'your', 'you', 'all', 'any',
  'each', 'every', 'how', 'what', 'which', 'who', 'whom', 'their',
  'them', 'then', 'than', 'more', 'most', 'such', 'like', 'just',
  'about', 'over', 'after', 'before', 'between', 'through', 'during',
  'using', 'based', 'including', 'across', 'within', 'without',
  'save', 'design', 'implement', 'build', 'create', 'make',
])

// ── 二次推断分类（当 SkillHub 分类过于笼统时补充） ───────────
const CATEGORY_KEYWORDS = {
  'Frontend': ['react', 'vue', 'svelte', 'angular', 'frontend', 'component', 'hooks', 'jsx', 'tsx', 'solid'],
  'Web Dev': ['web', 'nextjs', 'next', 'nuxt', 'fullstack', 'astro', 'html', 'http', 'seo', 'pwa', 'remix'],
  'Backend': ['backend', 'nestjs', 'express', 'fastapi', 'server', 'middleware', 'microservice', 'django', 'flask', 'spring'],
  'Database': ['database', 'sql', 'mongodb', 'prisma', 'redis', 'supabase', 'postgres', 'mysql', 'orm', 'migration', 'schema', 'sqlite'],
  'Mobile': ['mobile', 'react-native', 'flutter', 'ios', 'android', 'swift', 'kotlin', 'swiftui', 'dart', 'expo'],
  'Testing': ['testing', 'test', 'jest', 'playwright', 'cypress', 'vitest', 'e2e', 'unit-test', 'storybook'],
  'API': ['api', 'rest', 'graphql', 'grpc', 'swagger', 'openapi', 'endpoint'],
  'Cloud': ['cloud', 'aws', 'azure', 'gcp', 'serverless', 'lambda'],
  'CLI Tools': ['cli', 'terminal', 'bash', 'shell', 'command-line'],
  'Blockchain': ['blockchain', 'crypto', 'ethereum', 'solidity', 'web3'],
  'Game Dev': ['game', 'unity', 'unreal', 'godot'],
  'Monitoring': ['monitoring', 'logging', 'observability', 'metrics', 'grafana', 'prometheus'],
  'IoT': ['iot', 'embedded', 'arduino', 'raspberry', 'sensor', 'mqtt'],
}

function refineCategory(rawCategory, slug, name, description) {
  const mapped = CATEGORY_MAP[rawCategory]
  if (!mapped) return rawCategory || 'Automation'

  if (['DevOps', 'Automation'].includes(mapped)) {
    const text = `${slug} ${name} ${description}`.toLowerCase()
    let best = mapped
    let bestScore = 0
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const score = keywords.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0)
      if (score > bestScore) { bestScore = score; best = cat }
    }
    if (bestScore > 0) return best
  }

  return mapped
}

function extractTags(slug, description) {
  const words = slug.split('-').filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  const extra = (description.match(/\b[a-z][a-z0-9.]+\b/gi) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2 && w.length < 16 && !STOP_WORDS.has(w))
  return [...new Set([...words, ...extra])].slice(0, 6)
}

// ── SkillHub API 请求 ──────────────────────────────────────
async function fetchTopSkills() {
  try {
    const res = await fetch(`${API}/skills/top`)
    if (!res.ok) return []
    const data = await res.json()
    return data.code === 0 ? (data.data?.skills || []) : []
  } catch { return [] }
}

async function fetchSkillsPage(page, query = '') {
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (query) params.set('q', query)
    const res = await fetch(`${API}/skills?${params}`)
    if (!res.ok) return { skills: [], total: 0 }
    const data = await res.json()
    if (data.code !== 0) return { skills: [], total: 0 }
    return { skills: data.data?.skills || [], total: data.data?.total || 0 }
  } catch { return { skills: [], total: 0 } }
}

// ── ClawHub 回退（SkillHub 异常时使用） ─────────────────────
async function fetchFromClawHub(query) {
  try {
    const res = await fetch(`${CLAWHUB_API}/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch { return [] }
}

// ── 转换为输出格式 ──────────────────────────────────────────
function mapSkill(raw, idx) {
  const slug = raw.slug || ''
  const desc = raw.description || ''
  const category = refineCategory(raw.category, slug, raw.name || '', desc)
  return {
    id: slug,
    name: raw.name || slug,
    author: raw.ownerName || 'unknown',
    description: desc,
    descriptionZh: raw.description_zh || '',
    category,
    tags: extractTags(slug, desc),
    stars: raw.stars ?? 0,
    downloads: raw.downloads ?? 0,
    installs: raw.installs ?? 0,
    version: raw.version || '1.0.0',
    color: SKILL_COLORS[idx % SKILL_COLORS.length],
    installCommand: `skillhub install ${slug}`,
    homepage: raw.homepage || `https://clawhub.ai/${raw.ownerName}/${slug}`,
    updatedAt: raw.updated_at ? new Date(raw.updated_at).toISOString() : new Date().toISOString(),
  }
}

// ── 主流程 ─────────────────────────────────────────────────
async function main() {
  console.log('Fetching skills from Tencent SkillHub (lightmake.site)…')

  const slugMap = new Map()

  // 1) 先拉取精选 Top 50
  console.log('  Fetching Top 50 curated skills…')
  const topSkills = await fetchTopSkills()
  for (const s of topSkills) {
    if (s.slug && !slugMap.has(s.slug)) slugMap.set(s.slug, s)
  }
  console.log(`  Top skills loaded: ${topSkills.length}`)

  // 2) 分页拉取更多技能
  console.log('  Fetching paginated skills…')
  let page = 1
  let total = Infinity
  while (page <= MAX_PAGES && slugMap.size < total) {
    const result = await fetchSkillsPage(page)
    total = result.total
    if (result.skills.length === 0) break
    for (const s of result.skills) {
      if (s.slug && !slugMap.has(s.slug)) slugMap.set(s.slug, s)
    }
    console.log(`  Page ${page}: +${result.skills.length} skills (total unique: ${slugMap.size})`)
    page++
    await sleep(200)
  }

  console.log(`  Unique skills collected: ${slugMap.size}`)

  // 3) 转换格式并排序
  const skills = []
  let idx = 0
  for (const [, raw] of slugMap) {
    skills.push(mapSkill(raw, idx))
    idx++
  }

  skills.sort((a, b) => b.downloads - a.downloads || b.stars - a.stars)

  // 4) 输出
  const output = {
    fetchedAt: new Date().toISOString(),
    source: 'skillhub.tencent.com',
    count: skills.length,
    skills,
  }
  const outDir = join(process.cwd(), 'public')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'clawhub-skills.json'), JSON.stringify(output, null, 2))
  console.log(`Done — ${skills.length} skills written to public/clawhub-skills.json`)
}

main().catch((e) => { console.error(e); process.exit(1) })
