// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  readBacklogIssueSummary,
  readBacklogProjectName,
} from '../../../src/content/BacklogIssueReader';

function createRoot(html: string): HTMLElement {
  const doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = html;
  return doc.body;
}

describe('readBacklogProjectName', () => {
  it('header-icon-set__nameからプロジェクト名を取得する', () => {
    // Given: 準備
    const root = createRoot(
      '<span class="header-icon-set__name">Spring開発標準</span>'
    );

    // When/Then: 実行と検証
    expect(readBacklogProjectName(root)).toBe('Spring開発標準');
  });

  it('前後の空白・改行を除去する', () => {
    // Given: 準備
    const root = createRoot(
      '<span class="header-icon-set__name">\n  Spring開発標準  \n</span>'
    );

    // When/Then: 実行と検証
    expect(readBacklogProjectName(root)).toBe('Spring開発標準');
  });

  it.each([
    ['要素が無い', '<div>なし</div>'],
    ['テキストが空', '<span class="header-icon-set__name">  </span>'],
  ])('%s場合はnullを返す', (_label, html) => {
    // When/Then: 実行と検証
    expect(readBacklogProjectName(createRoot(html))).toBeNull();
  });
});

describe('readBacklogIssueSummary', () => {
  it('実際の課題ページの件名欄から課題名を取得する(説明文の.markdown-bodyは拾わない)', () => {
    // Given: 準備(添付HTMLの構造に基づく。件名より前に説明文の.markdown-bodyがあっても件名を優先する)
    const root = createRoot(`
      <div data-testid="issueDescription"><div class="markdown-body">説明文です</div></div>
      <h2 id="summary" class="ticket__title title-group__title -three-actions">
        <span class="title-group__title-text" data-testid="issueSummary">
          <div class="markdown-body">【アプリケーション方式設計書_1はじめに.xlsx】1.1 本書の目的</div>
        </span>
      </h2>
    `);

    // When/Then: 実行と検証
    expect(readBacklogIssueSummary(root)).toBe(
      '【アプリケーション方式設計書_1はじめに.xlsx】1.1 本書の目的'
    );
  });

  it('data-testidが無い場合は#summaryから取得する', () => {
    // Given: 準備
    const root = createRoot(
      '<h2 id="summary"><span><div class="markdown-body">課題A</div></span></h2>'
    );

    // When/Then: 実行と検証
    expect(readBacklogIssueSummary(root)).toBe('課題A');
  });

  it('件名欄が無い場合は固定ヘッダー(header-icon-set__summary)から取得する', () => {
    // Given: 準備
    const root = createRoot(`
      <h4 class="header-icon-set__text">
        <span class="header-icon-set__key">SPRING-3</span>
        <span class="header-icon-set__summary"><div class="markdown-body">課題B</div></span>
      </h4>
    `);

    // When/Then: 実行と検証
    expect(readBacklogIssueSummary(root)).toBe('課題B');
  });

  it('件名欄が見つからない場合はnullを返す(無関係な.markdown-bodyは拾わない)', () => {
    // Given: 準備
    const root = createRoot('<div class="markdown-body">コメント本文</div>');

    // When/Then: 実行と検証
    expect(readBacklogIssueSummary(root)).toBeNull();
  });
});
