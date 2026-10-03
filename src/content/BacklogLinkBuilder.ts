import type { BacklogIssueLink, ClipboardContent } from '../shared/types';
import { escapeHtml } from './BreadcrumbBuilder.js';

const SEPARATOR = ' > ';
const TEXT_LINE_BREAK = '\n';
const HTML_LINE_BREAK = '<br>';

// 出力フォーマット:
//   【プロジェクト名】 > 【課題名】
//   【課題URL】
export function buildBacklogLinkResult(
  link: BacklogIssueLink
): ClipboardContent {
  const titleText = `${link.projectName}${SEPARATOR}${link.issueSummary}`;
  const titleHtml = `${escapeHtml(link.projectName)}${SEPARATOR}${escapeHtml(link.issueSummary)}`;
  const urlHtml = `<a href="${escapeHtml(link.issueUrl)}">${escapeHtml(link.issueUrl)}</a>`;

  return {
    html: [titleHtml, urlHtml].join(HTML_LINE_BREAK),
    text: [titleText, link.issueUrl].join(TEXT_LINE_BREAK),
  };
}
