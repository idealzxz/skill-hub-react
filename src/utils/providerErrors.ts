/**
 * 将 fetch 失败转为用户可读的说明（含 HTTPS 页面请求 HTTP API 的混合内容问题）。
 */
export function formatProviderError(err: unknown, opts?: { apiUrl?: string }): string {
  const msg = err instanceof Error ? err.message : String(err)
  const failedFetch =
    msg === 'Failed to fetch' ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed')

  if (!failedFetch) return msg

  const secure = typeof window !== 'undefined' && window.isSecureContext
  const httpApi = opts?.apiUrl?.startsWith('http:')
  if (secure && httpApi) {
    return 'HTTPS 页面无法请求 HTTP 的 Git API（混合内容限制）。请将 API 改为 https://，或在 .env 设置 VITE_GITLAB_API_BASE 后重新构建。'
  }

  const api = opts?.apiUrl ?? ''
  const isGitHubApi =
    api.includes('api.github.com') || api.includes('__skillhub_github') || api === '/__skillhub_github'
  if (isGitHubApi) {
    return '无法连接 GitHub API（Failed to fetch）。可尝试：① 切换网络或 VPN（部分地区需代理访问 api.github.com）；② 本地开发在项目根 .env 添加 VITE_DEV_GITHUB_PROXY=1 后重启 yarn dev，由开发服务转发请求；③ 终端执行 curl -I https://api.github.com 检查是否可达。'
  }

  return '无法连接 Git 平台（Failed to fetch）。请检查网络、VPN、防火墙，或确认 API 域名可访问。'
}
