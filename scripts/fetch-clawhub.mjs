/**
 * 从 ClawHub 公开 API 拉取技能数据，输出到 public/clawhub-skills.json。
 * 供 GitHub Actions 定时执行，也可本地 `node scripts/fetch-clawhub.mjs` 手动跑。
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const API = 'https://clawhub.ai/api'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 搜索关键词，覆盖不同方向 ──────────────────────────
const SEARCH_QUERIES = [
  'react', 'vue', 'svelte', 'angular', 'frontend',
  'nextjs', 'web', 'fullstack',
  'ai', 'llm', 'machine learning', 'openai', 'langchain',
  'devops', 'docker', 'kubernetes', 'terraform', 'deploy',
  'database', 'sql', 'mongodb', 'prisma', 'redis',
  'mobile', 'flutter', 'react native', 'ios', 'android',
  'security', 'auth', 'oauth', 'encryption',
  'testing', 'test', 'jest', 'playwright', 'cypress',
  'ui', 'design', 'tailwind', 'css', 'animation',
  'backend', 'api', 'graphql', 'nestjs', 'express',
  'python', 'fastapi', 'django',
  'typescript', 'node', 'rust', 'go', 'java',
  'git', 'github', 'gitlab',
  'cloud', 'aws', 'azure', 'serverless',
  'cursor', 'coding', 'agent', 'mcp',
  'data', 'analytics',
  'blockchain', 'solidity',
  'game', 'unity',
  'cli', 'automation', 'workflow',
  'documentation', 'markdown',
  'monitoring', 'observability',
]

// ── 分类推断 ──────────────────────────────────────────
const CATEGORY_KEYWORDS = {
  'AI & ML': ['ai', 'ml', 'llm', 'machine-learning', 'openai', 'langchain', 'gpt', 'deep-learning', 'neural', 'model', 'embedding', 'agent', 'prompt', 'diffusion', 'rag'],
  'Frontend': ['react', 'vue', 'svelte', 'angular', 'frontend', 'component', 'hooks', 'state-management', 'jsx', 'tsx', 'solid'],
  'Web Dev': ['web', 'nextjs', 'next', 'nuxt', 'fullstack', 'astro', 'html', 'http', 'seo', 'pwa', 'remix'],
  'DevOps': ['devops', 'docker', 'kubernetes', 'k8s', 'terraform', 'ci-cd', 'deploy', 'pipeline', 'container', 'helm', 'jenkins', 'cloudflare'],
  'Database': ['database', 'sql', 'mongodb', 'prisma', 'redis', 'supabase', 'postgres', 'mysql', 'orm', 'migration', 'schema', 'nosql', 'sqlite'],
  'Mobile': ['mobile', 'react-native', 'flutter', 'ios', 'android', 'swift', 'kotlin', 'swiftui', 'dart', 'expo'],
  'Security': ['security', 'auth', 'oauth', 'jwt', 'encryption', 'penetration', 'owasp', 'firewall', 'ssl', 'tls', 'vulnerability'],
  'Testing': ['testing', 'test', 'jest', 'playwright', 'cypress', 'vitest', 'e2e', 'unit-test', 'storybook', 'coverage'],
  'UI/UX': ['design', 'ui', 'ux', 'figma', 'tailwind', 'css', 'animation', 'responsive', 'accessibility', 'a11y', 'color', 'typography', 'layout', 'style'],
  'Backend': ['backend', 'nestjs', 'express', 'fastapi', 'server', 'middleware', 'microservice', 'django', 'flask', 'spring'],
  'Data Science': ['data', 'analytics', 'pandas', 'jupyter', 'visualization', 'statistics', 'notebook'],
  'Blockchain': ['blockchain', 'crypto', 'ethereum', 'solidity', 'web3', 'nft', 'defi', 'smart-contract'],
  'Game Dev': ['game', 'unity', 'unreal', 'godot', 'physics', 'sprite', '3d-game', '2d-game'],
  'CLI Tools': ['cli', 'terminal', 'bash', 'shell', 'command-line', 'zsh', 'powershell'],
  'Documentation': ['documentation', 'docs', 'markdown', 'readme', 'wiki', 'jsdoc', 'typedoc'],
  'Monitoring': ['monitoring', 'logging', 'observability', 'metrics', 'alert', 'grafana', 'prometheus'],
  'API': ['api', 'rest', 'graphql', 'grpc', 'swagger', 'openapi', 'endpoint'],
  'Cloud': ['cloud', 'aws', 'azure', 'gcp', 'serverless', 'lambda', 'ec2', 's3'],
  'IoT': ['iot', 'embedded', 'arduino', 'raspberry', 'sensor', 'mqtt'],
  'Automation': ['automation', 'workflow', 'scraping', 'bot', 'cron', 'scheduler', 'task'],
}

const SKILL_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626',
  '#0891B2', '#DB2777', '#4F46E5', '#EA580C', '#0D9488',
]

function inferCategory(slug, displayName, summary) {
  const text = `${slug} ${displayName} ${summary}`.toLowerCase()
  let best = 'Automation'
  let bestScore = 0
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0)
    if (score > bestScore) { bestScore = score; best = cat }
  }
  return best
}

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

function extractTags(slug, summary) {
  const words = slug.split('-').filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  const extra = (summary.match(/\b[a-z][a-z0-9.]+\b/gi) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2 && w.length < 16 && !STOP_WORDS.has(w))
  return [...new Set([...words, ...extra])].slice(0, 6)
}

// ── 请求 ──────────────────────────────────────────────
async function fetchSearch(query) {
  try {
    const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch { return [] }
}

async function fetchDetail(slug) {
  try {
    const res = await fetch(`${API}/skill?slug=${encodeURIComponent(slug)}`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

// ── 主流程 ─────────────────────────────────────────────
async function main() {
  console.log('Fetching skills from ClawHub…')

  const slugMap = new Map()
  for (const q of SEARCH_QUERIES) {
    const results = await fetchSearch(q)
    for (const r of results) {
      if (!slugMap.has(r.slug)) slugMap.set(r.slug, r)
    }
    await sleep(120)
  }
  console.log(`  Unique skills found via search: ${slugMap.size}`)

  const skills = []
  let idx = 0
  for (const [slug] of slugMap) {
    const detail = await fetchDetail(slug)
    await sleep(120)
    if (!detail?.skill) continue

    const { skill, latestVersion, owner } = detail
    const category = inferCategory(slug, skill.displayName, skill.summary)

    skills.push({
      id: slug,
      name: skill.displayName || slug,
      author: owner?.handle || 'unknown',
      description: skill.summary || '',
      category,
      tags: extractTags(slug, skill.summary),
      stars: skill.stats?.stars ?? 0,
      downloads: skill.stats?.downloads ?? 0,
      version: latestVersion?.version || '1.0.0',
      color: SKILL_COLORS[idx % SKILL_COLORS.length],
      installCommand: `npx openclaw install ${slug}`,
      updatedAt: new Date(skill.updatedAt).toISOString(),
    })
    idx++
    if (idx % 50 === 0) console.log(`  Fetched ${idx} details…`)
  }

  skills.sort((a, b) => b.downloads - a.downloads || b.stars - a.stars)

  const output = { fetchedAt: new Date().toISOString(), count: skills.length, skills }
  const outDir = join(process.cwd(), 'public')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'clawhub-skills.json'), JSON.stringify(output, null, 2))
  console.log(`Done — ${skills.length} skills written to public/clawhub-skills.json`)
}

main().catch((e) => { console.error(e); process.exit(1) })
