// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { resolveBacklogIssueContext } from '../../../src/content/BacklogIssueResolver';
import {
  readBacklogIssueSummary,
  readBacklogProjectName,
} from '../../../src/content/BacklogIssueReader';
import { buildBacklogLinkResult } from '../../../src/content/BacklogLinkBuilder';

function createDom(html: string): Document {
  const doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = html;
  return doc;
}

// 実機のBacklog課題ページから取得したDOM構造に基づく(プロジェクト名はページ上部のヘッダー、
// 課題名は件名欄と固定ヘッダーの2箇所に表示され、説明文・コメントも.markdown-bodyを使う)
const BACKLOG_ISSUE_HTML = `
  <span class="header-icon-set__name">Spring開発標準</span>
  <div id="issueArea" data-testid="issueArea">
    <div class="ticket__key -has-button">
      <span class="pill pill--issue-type-1" data-testid="issueType">QA</span>
      <span class="ticket__key-number" data-testid="issueKey">SPRING-3</span>
    </div>
    <div class="ticket__title-group title-group -ticket" data-testid="issueDetailTitleGroup">
      <h2 id="summary" class="ticket__title title-group__title -three-actions">
        <span class="title-group__title-text" data-testid="issueSummary"><div class="markdown-body">【アプリケーション方式設計書_1はじめに.xlsx】1.1 本書の目的</div></span>
      </h2>
    </div>
    <div data-testid="issueDescription"><div class="markdown-body">説明文</div></div>
  </div>
  <div class="content-header__icon-set"><div class="header-icon-set">
    <h4 class="header-icon-set__text content-header__summary">
      <span class="header-icon-set__key">SPRING-3</span>
      <span class="header-icon-set__summary"><div class="markdown-body">【アプリケーション方式設計書_1はじめに.xlsx】1.1 本書の目的</div></span>
    </h4>
  </div></div>
`;

function runBacklogCopy(url: string, dom: Document) {
  const context = resolveBacklogIssueContext(url);
  const projectName = readBacklogProjectName(dom);
  const issueSummary = readBacklogIssueSummary(dom);
  return buildBacklogLinkResult({
    projectName: projectName ?? context!.projectKey,
    issueSummary: issueSummary!,
    issueUrl: context!.issueUrl,
  });
}

describe('Smart Link Copy(Backlog課題)', () => {
  it('実際の課題ページのDOMとURLから「プロジェクト名 > 課題名」+課題URLを生成する', () => {
    // Given: 準備
    const url = 'https://yonespring.backlog.com/view/SPRING-3';
    const dom = createDom(BACKLOG_ISSUE_HTML);

    // When: 実行
    const result = runBacklogCopy(url, dom);

    // Then: 検証
    expect(result.text).toBe(
      'Spring開発標準 > 【アプリケーション方式設計書_1はじめに.xlsx】1.1 本書の目的\n' +
        'https://yonespring.backlog.com/view/SPRING-3'
    );
    expect(result.html).toContain(
      '<a href="https://yonespring.backlog.com/view/SPRING-3">'
    );
  });

  it('プロジェクト名が取得できない場合はURLのプロジェクトキーで代替する', () => {
    // Given: 準備(プロジェクト名のヘッダーが無い)
    const url = 'https://yonespring.backlog.com/view/SPRING-3#comment-1';
    const dom = createDom(
      BACKLOG_ISSUE_HTML.replace(
        '<span class="header-icon-set__name">Spring開発標準</span>',
        ''
      )
    );

    // When: 実行
    const result = runBacklogCopy(url, dom);

    // Then: 検証
    expect(result.text).toBe(
      'SPRING > 【アプリケーション方式設計書_1はじめに.xlsx】1.1 本書の目的\n' +
        'https://yonespring.backlog.com/view/SPRING-3'
    );
  });
});
