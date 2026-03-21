# Skill Hub 产品路线图

> 以团队技能共享为核心，分阶段构建完整的 Cursor 技能管理与协作平台。

---

## 愿景

让团队中的每个人都能用上一致的、高质量的 Cursor 技能，同时鼓励成员将优秀的自建技能回馈给团队。

---

## 阶段规划

### P0-A：团队仓库订阅 + 一键同步（核心基础）

**目标**：解决"大家用一样的 skill"的核心痛点。

- 支持订阅任意 GitHub 仓库作为团队技能源
- 同时支持公开仓库（无需 Token）和私有仓库（使用用户 Token）
- 新增"团队技能"页面，展示来自团队仓库的所有技能
- 设置页面可管理（添加/移除）订阅的团队仓库
- 每个技能提供安装指令，点击详情面板可复制

**数据模型**：

```typescript
interface TeamRepo {
  id: string
  owner: string     // GitHub 用户/组织名
  repo: string      // 仓库名
  label: string     // 显示名称
  lastSynced?: string
}
```

**远程仓库结构**：

```
{team-repo}/
├── .skill-hub/
│   ├── index.json       # SkillMeta[]
│   ├── bundles.json     # SkillBundle[]（P0-B）
│   └── settings.json
└── skills/
    └── {skill-name}/
        └── SKILL.md
```

---

### P0-B：技能集合（Skill Bundles）

**目标**：新人入职一键配置，最直接的效率提升。

- 将多个相关技能打包为一个"集合"
- 例如："前端开发全家桶"、"DevOps 标准套件"
- 在团队技能页面展示集合，一键生成批量安装命令
- 集合数据存储在团队仓库的 `.skill-hub/bundles.json`

**数据模型**：

```typescript
interface SkillBundle {
  id: string
  name: string
  description: string
  skillNames: string[]
  author: string
  createdAt: string
  updatedAt: string
}
```

---

### P1-A：提交到团队（PR 审核流）

**目标**：让优秀技能有正式的共享通道。

- 在"我的技能"页面，每个技能卡片增加"提交到团队"按钮
- 自动向团队仓库发起 Pull Request
- 团队管理员 Review 后合并，所有成员下次同步即可获取
- 状态流转：`本地草稿 → 待审核 → 已发布`

**流程**：

```
用户点击"提交到团队"
  → Fork 团队仓库（如果未 fork）
  → 在 fork 中写入技能文件 + 更新 index.json
  → 向团队仓库创建 Pull Request
  → 返回 PR 链接供用户跟踪
```

---

### P1-B：版本控制 + 更新通知

**目标**：保证团队技能的一致性和可控性。

- 团队技能同步时记录版本号
- 本地已安装的技能与团队版本比较
- 有更新的技能显示橙色"有新版本"徽标
- 侧边栏"团队技能" tab 显示更新数量角标
- 点击可查看版本变更并一键更新

---

### P2：社区与发现

**目标**：构建更完善的技能生态。

- **技能评分与反馈** — 团队成员可对共享技能点赞/评分/评论
- **使用统计** — 记录安装次数，显示"团队内 X 人使用"
- **技能模板** — 提供常见技能模板（代码规范类、Prompt 工程类等）
- **技能锁定** — 团队可锁定技能到特定版本，避免上游更新导致行为不一致

---

## 技术架构

### 状态管理

所有新增状态通过现有的 `useReducer` + `Context` 架构管理，关键数据通过 `localStorage` 持久化。

### 远程通信

统一使用 GitHub REST API，通过 `GitHubService` 类封装。支持两种访问模式：
- **认证模式**：使用用户 Token，可访问私有仓库
- **公开模式**：无 Token，仅可访问公开仓库（受 API 速率限制）

### 导航结构

```
技能市场 → 我的技能 → 团队技能 → 我的收藏 → 安装指南 → 数据看板 → 最近浏览 → 设置
```
