import type { SkillMeta, TeamRepo, TeamSkill } from '../data/skills'
import { buildTeamSkillInstallCommand } from '../utils/installCommands'
import { fetchTeamIndex, normalizeSkillIndexData } from './github'
import { GitLabService } from './gitlab'
import { GiteeService } from './gitee'
import type { GitProviderType } from './git-provider'

function metaIdFromComposite(repoId: string, compositeId: string): string {
  const p = `${repoId}--`
  return compositeId.startsWith(p) ? compositeId.slice(p.length) : ''
}

/** 点击团队技能时从远端拉取最新 index，合并元数据（不拉取 SKILL.md，详情面板不展示） */
export async function syncTeamSkillFromRemote(
  skill: TeamSkill,
  repo: TeamRepo,
  token: string | null,
  gitProviderType: GitProviderType,
): Promise<TeamSkill> {
  const tokenForRepo = token && gitProviderType === repo.platform ? token : null
  const metaId = metaIdFromComposite(repo.id, skill.id)

  let metas: SkillMeta[] = []

  if (repo.platform === 'github') {
    metas = await fetchTeamIndex(repo.owner, repo.repo, tokenForRepo)
  } else if (repo.platform === 'gitlab') {
    if (tokenForRepo) {
      const svc = new GitLabService(tokenForRepo)
      const indexRes = await svc.readRepoIndex(repo.owner, repo.repo)
      metas = indexRes?.data || []
    } else {
      const indexFile = await GitLabService.readPublicRepoFile('https://gitlab.com', repo.owner, repo.repo, '.skill-hub/index.json')
      metas = indexFile ? normalizeSkillIndexData(JSON.parse(indexFile.content)) : []
    }
  } else if (repo.platform === 'gitee') {
    if (tokenForRepo) {
      const svc = new GiteeService(tokenForRepo)
      const indexRes = await svc.readRepoIndex(repo.owner, repo.repo)
      metas = indexRes?.data || []
    } else {
      const indexFile = await GiteeService.readPublicRepoFile('', repo.owner, repo.repo, '.skill-hub/index.json')
      metas = indexFile ? normalizeSkillIndexData(JSON.parse(indexFile.content)) : []
    }
  }

  const meta = metas.find((m) => m.id === metaId) || metas.find((m) => m.name === skill.name)

  if (meta) {
    const next: TeamSkill = {
      ...skill,
      name: meta.name,
      author: repo.owner,
      description: meta.description,
      category: meta.category,
      tags: meta.tags ?? [],
      version: meta.version,
      color: meta.color || skill.color,
      updatedAt: meta.updatedAt,
      installCommand: '',
    }
    return { ...next, installCommand: buildTeamSkillInstallCommand(next) }
  }

  return {
    ...skill,
    installCommand: buildTeamSkillInstallCommand(skill),
  }
}
