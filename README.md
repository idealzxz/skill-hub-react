<div align="center">

# ⚡ Skill Hub

**一站式 Cursor 技能管理平台**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)

[English](#english) · 中文

</div>

---

## 功能特性

### 🏪 技能市场
- 浏览 **67,000+** 来自 [ClawHub](https://clawhub.ai) / [SkillHub](https://skillhub.tencent.com) 社区的优质技能
- 支持按分类（20 个类别）、关键词、标签多维搜索
- 按热度、最新、名称排序，分页浏览

### ❤️ 收藏与批量安装
- 一键收藏市场中感兴趣的技能
- 支持 **SkillHub CLI** 和 **Git Clone** 两种批量安装格式
- 自动适配 Windows / macOS / Linux 平台路径
- 收藏列表支持 JSON 导入 / 导出

### 🛠 我的技能
- 创建和编辑自己的 Cursor 技能（Markdown 编辑器 + 实时预览）
- 技能以 `SKILL.md` 文件存储在 Git 仓库中
- 完整的 CRUD 操作与同步状态追踪

### 👥 团队技能
- 订阅 GitHub / GitLab / Gitee 上的团队仓库
- 浏览团队共享的技能和技能集合（Bundles）
- 支持按仓库和分类筛选

### ☁️ 云端同步
- 绑定 **GitHub / GitLab / Gitee** 账号，数据自动同步到**私有**仓库 `cursor-skills`
- 同步内容包括：我的技能、收藏列表、主题偏好、团队仓库配置
- 变更后 3 秒自动推送，换设备登录即刻恢复
- 仓库结构：
  ```
  cursor-skills/          ← 私有仓库
  ├── .skill-hub/
  │   ├── index.json      ← 技能索引
  │   ├── favorites.json  ← 收藏列表
  │   └── settings.json   ← 主题 + 团队仓库
  └── skills/
      └── {name}/SKILL.md ← 技能文件
  ```

### 🎨 界面与体验
- 毛玻璃质感 UI，支持浅色 / 深色 / 跟随系统三种主题
- 响应式布局，桌面端侧边栏 + 移动端底部导航
- 流畅的 Framer Motion 动画过渡
- 键盘快捷键：`Ctrl+K` 搜索、`Ctrl+J` 切换主题、`Alt+1~8` 快速导航

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript 5.9 |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 动画 | Framer Motion |
| 图标 | Lucide React |
| Markdown | react-markdown + remark-gfm |
| 状态管理 | React Context + useReducer |
| 持久化 | localStorage + Git API |

## 快速开始

```bash
# 克隆项目
git clone https://github.com/your-username/skill-hub-react.git
cd skill-hub-react

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 更新技能市场数据
npm run fetch:clawhub
```

## 项目结构

```
src/
├── components/       # 通用组件（Sidebar、SkillCard、SkillDetailModal...）
├── data/             # 类型定义与演示数据
├── hooks/            # 自定义 Hooks（键盘快捷键）
├── pages/            # 页面组件（Market、Favorites、Install、Settings...）
├── services/         # Git API 服务（GitHub、GitLab、Gitee、同步逻辑）
├── store/            # 状态管理（AppContext）
├── utils.ts          # 工具函数
├── index.css         # 全局样式与主题变量
└── App.tsx           # 根组件与路由
```

## License

[MIT](LICENSE)

---

<a id="english"></a>

<div align="center">

# ⚡ Skill Hub

**All-in-one Cursor Skill Management Platform**

[中文](#) · English

</div>

---

## Features

### 🏪 Skill Marketplace
- Browse **67,000+** community skills from [ClawHub](https://clawhub.ai) / [SkillHub](https://skillhub.tencent.com)
- Multi-dimensional search by category (20 categories), keywords, and tags
- Sort by popularity, newest, or name with pagination

### ❤️ Favorites & Batch Install
- One-click favorite any skill from the marketplace
- Batch install via **SkillHub CLI** or **Git Clone** formats
- Auto-adapts paths for Windows / macOS / Linux
- Import / export favorites as JSON

### 🛠 My Skills
- Create and edit your own Cursor skills (Markdown editor + live preview)
- Skills stored as `SKILL.md` files in a Git repository
- Full CRUD operations with sync status tracking

### 👥 Team Skills
- Subscribe to team repositories on GitHub / GitLab / Gitee
- Browse shared skills and skill bundles
- Filter by repository and category

### ☁️ Cloud Sync
- Bind your **GitHub / GitLab / Gitee** account to auto-sync data to a **private** `cursor-skills` repository
- Synced data includes: my skills, favorites, theme preferences, team repo configurations
- Auto-pushes 3 seconds after changes; instantly restores on new device login
- Repository structure:
  ```
  cursor-skills/            ← Private repo
  ├── .skill-hub/
  │   ├── index.json        ← Skill index
  │   ├── favorites.json    ← Favorites list
  │   └── settings.json     ← Theme + team repos
  └── skills/
      └── {name}/SKILL.md   ← Skill files
  ```

### 🎨 UI & UX
- Glassmorphism UI with light / dark / system theme modes
- Responsive layout: sidebar on desktop, bottom nav on mobile
- Smooth Framer Motion animations
- Keyboard shortcuts: `Ctrl+K` search, `Ctrl+J` toggle theme, `Alt+1~8` quick nav

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Markdown | react-markdown + remark-gfm |
| State | React Context + useReducer |
| Persistence | localStorage + Git API |

## Getting Started

```bash
# Clone the project
git clone https://github.com/your-username/skill-hub-react.git
cd skill-hub-react

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Update marketplace data
npm run fetch:clawhub
```

## Project Structure

```
src/
├── components/       # Shared components (Sidebar, SkillCard, SkillDetailModal...)
├── data/             # Type definitions & demo data
├── hooks/            # Custom hooks (keyboard shortcuts)
├── pages/            # Page components (Market, Favorites, Install, Settings...)
├── services/         # Git API services (GitHub, GitLab, Gitee, sync logic)
├── store/            # State management (AppContext)
├── utils.ts          # Utility functions
├── index.css         # Global styles & theme variables
└── App.tsx           # Root component & routing
```

## License

[MIT](LICENSE)
