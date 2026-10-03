import type { BacklogIssueContext } from '../shared/types';

// Backlogはスペースごとに `<スペースID>.backlog.com` / `.backlog.jp` / `.backlogtool.com` のサブドメインを持つ
const BACKLOG_HOST_SUFFIXES = [
  '.backlog.com',
  '.backlog.jp',
  '.backlogtool.com',
];
// 課題詳細ページのpathnameは `/view/<プロジェクトキー>-<課題番号>`(例: /view/SPRING-3)
const ISSUE_PATH_PATTERN = /^\/view\/(([A-Z0-9_]+)-\d+)\/?$/;

function isBacklogHost(hostname: string): boolean {
  return BACKLOG_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export function resolveBacklogIssueContext(
  url: string
): BacklogIssueContext | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!isBacklogHost(parsed.hostname)) {
    return null;
  }

  const matched = ISSUE_PATH_PATTERN.exec(parsed.pathname);
  if (!matched) {
    return null;
  }

  const [, issueKey, projectKey] = matched;
  // `#comment-xxx`等のハッシュやクエリは共有用リンクには不要なため、origin + pathnameのみを使う
  const issueUrl = parsed.origin + parsed.pathname.replace(/\/$/, '');

  return { issueKey, projectKey, issueUrl };
}
