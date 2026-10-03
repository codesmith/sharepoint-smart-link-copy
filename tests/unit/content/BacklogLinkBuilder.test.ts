import { describe, it, expect } from 'vitest';
import { buildBacklogLinkResult } from '../../../src/content/BacklogLinkBuilder';

describe('buildBacklogLinkResult', () => {
  it('「プロジェクト名 > 課題名」と課題URLを2行で出力する', () => {
    // Given: 準備
    const link = {
      projectName: 'Spring開発標準',
      issueSummary:
        '【アプリケーション方式設計書_1はじめに.xlsx】1.1 本書の目的',
      issueUrl: 'https://yonespring.backlog.com/view/SPRING-3',
    };

    // When: 実行
    const result = buildBacklogLinkResult(link);

    // Then: 検証
    expect(result.text).toBe(
      'Spring開発標準 > 【アプリケーション方式設計書_1はじめに.xlsx】1.1 本書の目的\n' +
        'https://yonespring.backlog.com/view/SPRING-3'
    );
    expect(result.html).toBe(
      'Spring開発標準 > 【アプリケーション方式設計書_1はじめに.xlsx】1.1 本書の目的<br>' +
        '<a href="https://yonespring.backlog.com/view/SPRING-3">https://yonespring.backlog.com/view/SPRING-3</a>'
    );
  });

  it('HTMLではプロジェクト名・課題名・URLをエスケープする(textはそのまま)', () => {
    // Given: 準備
    const link = {
      projectName: 'A&B',
      issueSummary: '<script>alert("x")</script>',
      issueUrl: 'https://example.backlog.com/view/A-1',
    };

    // When: 実行
    const result = buildBacklogLinkResult(link);

    // Then: 検証
    expect(result.html).toBe(
      'A&amp;B > &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;' +
        '<br><a href="https://example.backlog.com/view/A-1">https://example.backlog.com/view/A-1</a>'
    );
    expect(result.text).toBe(
      'A&B > <script>alert("x")</script>\nhttps://example.backlog.com/view/A-1'
    );
  });
});
