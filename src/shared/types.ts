export type SiteType = 'onedrive-personal' | 'sharepoint-site';

export interface BreadcrumbSegment {
  label: string;
  url: string | null;
}

export interface PageContext {
  siteType: SiteType;
  origin: string;
  pathname: string;
  idParam: string;
  viewId?: string;
}

// クリップボードに書き込む内容(text/htmlとtext/plain)。サイトごとの整形結果に共通する形
export interface ClipboardContent {
  html: string;
  text: string;
}

export interface BreadcrumbResult extends ClipboardContent {
  segments: BreadcrumbSegment[];
  selectedItems: string[];
}

export interface BacklogIssueContext {
  issueKey: string; // 例: SPRING-3
  projectKey: string; // 例: SPRING
  issueUrl: string; // 例: https://yonespring.backlog.com/view/SPRING-3
}

export interface BacklogIssueLink {
  projectName: string;
  issueSummary: string;
  issueUrl: string;
}
