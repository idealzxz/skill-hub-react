export interface Skill {
  id: string
  name: string
  author: string
  description: string
  category: string
  tags: string[]
  stars: number
  downloads: number
  version: string
  color: string
  installCommand: string
  updatedAt: string
}

export interface UserSkill extends Skill {
  isOwned: true
  skillMdContent: string
  repoPath: string
  sha?: string
  indexSha?: string
  lastSynced?: string
  syncStatus: 'synced' | 'local' | 'modified'
}

export interface SkillMeta {
  id: string
  name: string
  author: string
  description: string
  category: string
  tags: string[]
  version: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface TeamRepo {
  id: string
  owner: string
  repo: string
  label: string
  platform: 'github' | 'gitlab' | 'gitee'
  lastSynced?: string
}

export interface SkillBundle {
  id: string
  name: string
  description: string
  skillNames: string[]
  author: string
  createdAt: string
  updatedAt: string
}

export interface TeamSkill extends Skill {
  repoId: string
  repoLabel: string
  repoOwner: string
  repoName: string
  skillMdContent?: string
}

export const CATEGORIES = [
  'AI & ML', 'Web Dev', 'DevOps', 'Database', 'Mobile',
  'Security', 'Testing', 'UI/UX', 'Backend', 'Frontend',
  'Data Science', 'Blockchain', 'Game Dev', 'CLI Tools',
  'Documentation', 'Monitoring', 'API', 'Cloud', 'IoT', 'Automation',
]

export const CAT_COLORS: Record<string, string> = {
  'AI & ML': 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300',
  'Web Dev': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'DevOps': 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300',
  'Database': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  'Mobile': 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300',
  'Security': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
  'Testing': 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
  'UI/UX': 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300',
  'Backend': 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  'Frontend': 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300',
  'Data Science': 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
  'Blockchain': 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  'Game Dev': 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
  'CLI Tools': 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300',
  'Documentation': 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',
  'Monitoring': 'bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300',
  'API': 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
  'Cloud': 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
  'IoT': 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
  'Automation': 'bg-stone-100 dark:bg-stone-500/20 text-stone-700 dark:text-stone-300',
}

const SKILL_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626',
  '#0891B2', '#DB2777', '#4F46E5', '#EA580C', '#0D9488',
]

export function pickColor(index: number) {
  return SKILL_COLORS[index % SKILL_COLORS.length]
}

const RAW_SKILLS = [
  { name: 'cursor-ai-rules', author: 'pontusab', desc: '为 Cursor AI 提供智能编码规则和最佳实践', category: 'AI & ML', tags: ['cursor', 'rules', 'ai'], stars: 15200, downloads: 89000 },
  { name: 'react-component-gen', author: 'shadcn', desc: '自动生成 React 组件，支持 TypeScript 和 Tailwind', category: 'Frontend', tags: ['react', 'typescript', 'component'], stars: 12800, downloads: 76000 },
  { name: 'nextjs-fullstack', author: 'vercel', desc: 'Next.js 全栈开发技能包，含 API 路由和数据库集成', category: 'Web Dev', tags: ['nextjs', 'fullstack', 'api'], stars: 11500, downloads: 68000 },
  { name: 'docker-compose-wizard', author: 'dockerhub', desc: '智能生成 Docker Compose 配置文件', category: 'DevOps', tags: ['docker', 'compose', 'container'], stars: 9800, downloads: 54000 },
  { name: 'prisma-schema-gen', author: 'prisma', desc: 'Prisma 数据库 Schema 智能生成与优化', category: 'Database', tags: ['prisma', 'orm', 'schema'], stars: 8700, downloads: 47000 },
  { name: 'tailwind-ui-patterns', author: 'adamwathan', desc: '100+ Tailwind CSS UI 模式和组件', category: 'UI/UX', tags: ['tailwind', 'css', 'patterns'], stars: 14200, downloads: 92000 },
  { name: 'jest-test-gen', author: 'facebook', desc: '自动生成 Jest 单元测试和集成测试', category: 'Testing', tags: ['jest', 'testing', 'unit-test'], stars: 7600, downloads: 41000 },
  { name: 'aws-lambda-deploy', author: 'awscloud', desc: 'AWS Lambda 函数快速部署和配置', category: 'DevOps', tags: ['aws', 'lambda', 'serverless'], stars: 6900, downloads: 38000 },
  { name: 'flutter-widget-lib', author: 'flutterdev', desc: 'Flutter 自定义 Widget 库和动画组件', category: 'Mobile', tags: ['flutter', 'widget', 'animation'], stars: 8200, downloads: 45000 },
  { name: 'oauth2-security', author: 'auth0', desc: 'OAuth2 / OpenID Connect 安全认证实现', category: 'Security', tags: ['oauth2', 'auth', 'security'], stars: 7100, downloads: 39000 },
  { name: 'graphql-resolver', author: 'apollographql', desc: 'GraphQL Resolver 自动生成和类型安全', category: 'Backend', tags: ['graphql', 'resolver', 'api'], stars: 6500, downloads: 35000 },
  { name: 'vue-composition-api', author: 'vuejs', desc: 'Vue 3 Composition API 最佳实践和模式', category: 'Frontend', tags: ['vue', 'composition', 'reactive'], stars: 9100, downloads: 51000 },
  { name: 'kubernetes-manifests', author: 'k8sio', desc: 'Kubernetes 清单文件智能生成和验证', category: 'DevOps', tags: ['k8s', 'kubernetes', 'yaml'], stars: 7800, downloads: 43000 },
  { name: 'mongodb-aggregation', author: 'mongodb', desc: 'MongoDB 聚合管道构建器和优化器', category: 'Database', tags: ['mongodb', 'aggregation', 'nosql'], stars: 5900, downloads: 32000 },
  { name: 'react-native-nav', author: 'reactnative', desc: 'React Native 导航和路由最佳实践', category: 'Mobile', tags: ['react-native', 'navigation', 'mobile'], stars: 6800, downloads: 37000 },
  { name: 'ui-ux-pro-max', author: 'nicepkg', desc: '综合设计指南：67 种风格、96 套配色、57 组字体', category: 'UI/UX', tags: ['design', 'colors', 'typography'], stars: 18500, downloads: 105000 },
  { name: 'python-fastapi', author: 'tiangolo', desc: 'FastAPI 项目脚手架和 API 文档生成', category: 'Backend', tags: ['python', 'fastapi', 'api'], stars: 10200, downloads: 58000 },
  { name: 'cypress-e2e', author: 'cypress-io', desc: 'Cypress E2E 测试自动化脚本生成', category: 'Testing', tags: ['cypress', 'e2e', 'testing'], stars: 5400, downloads: 29000 },
  { name: 'terraform-modules', author: 'hashicorp', desc: 'Terraform 基础设施模块和最佳实践', category: 'DevOps', tags: ['terraform', 'iac', 'cloud'], stars: 8400, downloads: 46000 },
  { name: 'svelte-kit-starter', author: 'sveltejs', desc: 'SvelteKit 项目模板和路由模式', category: 'Frontend', tags: ['svelte', 'sveltekit', 'ssr'], stars: 6200, downloads: 34000 },
  { name: 'redis-caching', author: 'redis', desc: 'Redis 缓存策略和性能优化方案', category: 'Database', tags: ['redis', 'cache', 'performance'], stars: 5700, downloads: 31000 },
  { name: 'jwt-auth-guard', author: 'auth-team', desc: 'JWT 认证守卫和中间件实现', category: 'Security', tags: ['jwt', 'auth', 'middleware'], stars: 6300, downloads: 34000 },
  { name: 'openai-integration', author: 'openai', desc: 'OpenAI GPT API 集成和 Prompt 工程', category: 'AI & ML', tags: ['openai', 'gpt', 'prompt'], stars: 13600, downloads: 78000 },
  { name: 'storybook-stories', author: 'storybookjs', desc: '自动生成 Storybook Stories 和文档', category: 'Testing', tags: ['storybook', 'docs', 'components'], stars: 4800, downloads: 26000 },
  { name: 'nestjs-modules', author: 'nestjs', desc: 'NestJS 模块、控制器和服务模板', category: 'Backend', tags: ['nestjs', 'nodejs', 'typescript'], stars: 7400, downloads: 40000 },
  { name: 'langchain-agents', author: 'langchain-ai', desc: 'LangChain Agent 和 Chain 构建工具', category: 'AI & ML', tags: ['langchain', 'agent', 'llm'], stars: 11800, downloads: 65000 },
  { name: 'supabase-starter', author: 'supabase', desc: 'Supabase 后端即服务快速集成模板', category: 'Database', tags: ['supabase', 'postgres', 'auth'], stars: 8900, downloads: 49000 },
  { name: 'figma-to-code', author: 'figma', desc: '将 Figma 设计稿转换为响应式代码', category: 'UI/UX', tags: ['figma', 'design', 'responsive'], stars: 10500, downloads: 60000 },
  { name: 'github-actions-ci', author: 'github', desc: 'GitHub Actions CI/CD 工作流模板', category: 'DevOps', tags: ['github', 'ci-cd', 'actions'], stars: 9500, downloads: 53000 },
  { name: 'playwright-testing', author: 'microsoft', desc: 'Playwright 浏览器自动化和测试框架', category: 'Testing', tags: ['playwright', 'browser', 'automation'], stars: 7200, downloads: 39000 },
  { name: 'swift-ios-kit', author: 'apple-dev', desc: 'SwiftUI iOS 应用开发工具包', category: 'Mobile', tags: ['swift', 'ios', 'swiftui'], stars: 5800, downloads: 31000 },
  { name: 'sql-query-builder', author: 'knexjs', desc: 'SQL 查询构建器和数据库迁移工具', category: 'Database', tags: ['sql', 'query', 'migration'], stars: 4900, downloads: 27000 },
  { name: 'websocket-realtime', author: 'socketio', desc: 'WebSocket 实时通信和事件系统', category: 'Backend', tags: ['websocket', 'realtime', 'events'], stars: 6100, downloads: 33000 },
  { name: 'css-animation-lib', author: 'animatecss', desc: 'CSS 动画库和过渡效果集合', category: 'Frontend', tags: ['css', 'animation', 'transitions'], stars: 7900, downloads: 44000 },
  { name: 'penetration-testing', author: 'owasp', desc: 'Web 应用渗透测试和安全审计工具', category: 'Security', tags: ['pentest', 'owasp', 'audit'], stars: 5100, downloads: 28000 },
  { name: 'ml-model-deploy', author: 'huggingface', desc: '机器学习模型部署和推理优化', category: 'AI & ML', tags: ['ml', 'deployment', 'inference'], stars: 9300, downloads: 52000 },
  { name: 'astro-static-site', author: 'astrobuild', desc: 'Astro 静态站点生成和内容管理', category: 'Web Dev', tags: ['astro', 'static', 'cms'], stars: 6700, downloads: 36000 },
  { name: 'electron-desktop', author: 'electron', desc: 'Electron 桌面应用开发模板和工具', category: 'Web Dev', tags: ['electron', 'desktop', 'app'], stars: 5500, downloads: 30000 },
  { name: 'stripe-payments', author: 'stripe', desc: 'Stripe 支付集成和订阅管理', category: 'Backend', tags: ['stripe', 'payment', 'subscription'], stars: 7700, downloads: 42000 },
  { name: 'cloudflare-workers', author: 'cloudflare', desc: 'Cloudflare Workers 边缘计算开发工具', category: 'DevOps', tags: ['cloudflare', 'edge', 'workers'], stars: 6400, downloads: 35000 },
]

export function generateDemoSkills(): Skill[] {
  return RAW_SKILLS.map((s, i) => ({
    id: `skill-${i}`,
    name: s.name,
    author: s.author,
    description: s.desc,
    category: s.category,
    tags: s.tags,
    stars: s.stars,
    downloads: s.downloads,
    version: `${(i % 3) + 1}.${i % 10}.${i % 20}`,
    color: SKILL_COLORS[i % SKILL_COLORS.length],
    installCommand: `git clone https://github.com/${s.author}/${s.name}.git ~/.cursor/skills/${s.name}`,
    updatedAt: new Date(2026, i % 3, (i % 28) + 1).toISOString(),
  }))
}
