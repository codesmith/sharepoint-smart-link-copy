// Backlogの課題ページのDOMから、プロジェクト名と課題名(件名)を読み取る。
// 説明文・コメントも同じ`.markdown-body`クラスを使うため、件名欄の内側に限定して探す。
// 見つからない場合は例外を投げずnullを返す。
const PROJECT_NAME_SELECTOR = '.header-icon-set__name';

const ISSUE_SUMMARY_SELECTORS = [
  '[data-testid="issueSummary"] .markdown-body',
  '#summary .markdown-body',
  '.header-icon-set__summary .markdown-body',
];

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/[\t\n\r ]+/g, ' ').replace(/^ | $/g, '');
}

export function readBacklogProjectName(root: ParentNode): string | null {
  const name = normalizeText(
    root.querySelector(PROJECT_NAME_SELECTOR)?.textContent
  );
  return name || null;
}

export function readBacklogIssueSummary(root: ParentNode): string | null {
  for (const selector of ISSUE_SUMMARY_SELECTORS) {
    const summary = normalizeText(root.querySelector(selector)?.textContent);
    if (summary) {
      return summary;
    }
  }
  return null;
}
