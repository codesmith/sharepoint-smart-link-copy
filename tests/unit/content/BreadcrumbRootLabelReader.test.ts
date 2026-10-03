// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readBreadcrumbRootLabel } from '../../../src/content/BreadcrumbRootLabelReader';

function createRoot(html: string): HTMLElement {
  const doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = html;
  return doc.body;
}

describe('readBreadcrumbRootLabel', () => {
  it('実際のOneDriveのパンくずDOM構造から「マイファイル」を取得できる', () => {
    // Given: 準備(実機キャプチャに基づく構造。ルート表示時は1件のみのパンくず)
    const root = createRoot(`
      <ol data-automationid="breadcrumb-root-id">
        <li data-automationid="breadcrumb-listitem">
          <h1>
            <button data-automationid="breadcrumb-crumb" aria-haspopup="menu">
              <span title="マイファイル" class="breadcrumbTextItem_e8d4563a" style="max-width: 158px;">マイファイル</span>
              <i role="presentation" aria-hidden="true"></i>
            </button>
          </h1>
        </li>
      </ol>
    `);

    // When/Then: 実行と検証
    expect(readBreadcrumbRootLabel(root)).toBe('マイファイル');
  });

  it('複数階層のパンくずがある場合、先頭(文書順で最初)のラベルを使う', () => {
    // Given: 準備(フォルダーを辿った状態を想定し、複数のbreadcrumb-crumbが並ぶ)
    const root = createRoot(`
      <ol>
        <li><button data-automationid="breadcrumb-crumb"><span title="営業部サイト">営業部サイト</span></button></li>
        <li><button data-automationid="breadcrumb-crumb"><span title="2025年度">2025年度</span></button></li>
      </ol>
    `);

    // When/Then: 実行と検証
    expect(readBreadcrumbRootLabel(root)).toBe('営業部サイト');
  });

  it('title属性が無い場合はテキストをそのまま使う', () => {
    // Given: 準備
    const root = createRoot(`
      <button data-automationid="breadcrumb-crumb"><span>開発部サイト</span></button>
    `);

    // When/Then: 実行と検証
    expect(readBreadcrumbRootLabel(root)).toBe('開発部サイト');
  });

  it('前後の空白・改行を除去する', () => {
    // Given: 準備
    const root = createRoot(`
      <button data-automationid="breadcrumb-crumb">
        <span title="
          マイファイル
        "></span>
      </button>
    `);

    // When/Then: 実行と検証
    expect(readBreadcrumbRootLabel(root)).toBe('マイファイル');
  });

  it('breadcrumb-crumbが見つからない場合はnullを返す', () => {
    // Given: 準備
    const root = createRoot('<div>パンくずは存在しない</div>');

    // When/Then: 実行と検証
    expect(readBreadcrumbRootLabel(root)).toBeNull();
  });

  it('テキストが空の場合はnullを返す', () => {
    // Given: 準備
    const root = createRoot(
      '<button data-automationid="breadcrumb-crumb"><span title="   "></span></button>'
    );

    // When/Then: 実行と検証
    expect(readBreadcrumbRootLabel(root)).toBeNull();
  });

  it('例外を投げない', () => {
    // Given: 準備
    const root = createRoot('');

    // When/Then: 実行と検証
    expect(() => readBreadcrumbRootLabel(root)).not.toThrow();
  });
});
