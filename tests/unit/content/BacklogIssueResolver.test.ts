import { describe, it, expect } from 'vitest';
import { resolveBacklogIssueContext } from '../../../src/content/BacklogIssueResolver';

describe('resolveBacklogIssueContext', () => {
  it('Backlogの課題ページURLから課題キー・プロジェクトキー・課題URLを取得する', () => {
    // Given: 準備
    const url = 'https://yonespring.backlog.com/view/SPRING-3';

    // When: 実行
    const context = resolveBacklogIssueContext(url);

    // Then: 検証
    expect(context).toEqual({
      issueKey: 'SPRING-3',
      projectKey: 'SPRING',
      issueUrl: 'https://yonespring.backlog.com/view/SPRING-3',
    });
  });

  it.each([
    'https://example.backlog.jp/view/PRJ_A-12',
    'https://example.backlogtool.com/view/PRJ_A-12',
  ])('%s のドメインにも対応する', (url) => {
    // When: 実行
    const context = resolveBacklogIssueContext(url);

    // Then: 検証
    expect(context?.issueKey).toBe('PRJ_A-12');
    expect(context?.projectKey).toBe('PRJ_A');
  });

  it('課題URLからクエリ・ハッシュ・末尾のスラッシュを除去する', () => {
    // Given: 準備
    const url =
      'https://yonespring.backlog.com/view/SPRING-3/?foo=bar#comment-191754834';

    // When: 実行
    const context = resolveBacklogIssueContext(url);

    // Then: 検証
    expect(context?.issueUrl).toBe(
      'https://yonespring.backlog.com/view/SPRING-3'
    );
  });

  it.each([
    ['課題一覧ページ', 'https://yonespring.backlog.com/find/SPRING'],
    ['Wikiページ', 'https://yonespring.backlog.com/wiki/SPRING/Home'],
    ['Backlog以外のドメイン', 'https://example.com/view/SPRING-3'],
    [
      'SharePoint',
      'https://contoso.sharepoint.com/sites/Sales/Documents/Forms/AllItems.aspx',
    ],
    ['不正なURL', 'not a url'],
  ])('%sの場合はnullを返す', (_label, url) => {
    // When/Then: 実行と検証
    expect(resolveBacklogIssueContext(url)).toBeNull();
  });
});
