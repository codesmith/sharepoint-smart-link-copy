// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  readBreadcrumbLabels,
  readBreadcrumbRootLabel,
  selectRootLabel,
} from '../../../src/content/BreadcrumbRootLabelReader';
import type { BreadcrumbSegment } from '../../../src/shared/types';

function createRoot(html: string): HTMLElement {
  const doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = html;
  return doc.body;
}

// URLから構築した階層(先頭は起点。起点のラベルはURLベースの値)
function toSegments(rootLabel: string, folders: string[]): BreadcrumbSegment[] {
  return [
    { label: rootLabel, url: null },
    ...folders.map((label) => ({ label, url: `https://example.com/${label}` })),
  ];
}

function crumbsHtml(labels: string[]): string {
  return labels
    .map(
      (label) =>
        `<li><button data-automationid="breadcrumb-crumb"><span title="${label}">${label}</span></button></li>`
    )
    .join('');
}

describe('readBreadcrumbLabels', () => {
  it('実際のOneDriveのパンくずDOM構造から、全階層のラベルを文書順に取得する', () => {
    // Given: 準備(実機キャプチャに基づく構造)
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
        <li data-automationid="breadcrumb-listitem">
          <button data-automationid="breadcrumb-crumb"><span title="■勉強会資料">■勉強会...</span></button>
        </li>
      </ol>
    `);

    // When/Then: 実行と検証(表示が省略されていてもtitle属性の元の文字列を使う)
    expect(readBreadcrumbLabels(root)).toEqual(['マイファイル', '■勉強会資料']);
  });

  it('title属性が無い場合はテキストを使い、前後の空白を除去し、空のラベルは除外する', () => {
    // Given: 準備
    const root = createRoot(`
      <button data-automationid="breadcrumb-crumb"><span>  開発部サイト  </span></button>
      <button data-automationid="breadcrumb-crumb"><span title="   "></span></button>
    `);

    // When/Then: 実行と検証
    expect(readBreadcrumbLabels(root)).toEqual(['開発部サイト']);
  });

  it('breadcrumb-crumbが見つからない場合は空配列を返す', () => {
    // When/Then: 実行と検証
    expect(readBreadcrumbLabels(createRoot('<div>なし</div>'))).toEqual([]);
  });
});

describe('selectRootLabel', () => {
  it('起点が見えている場合、フォルダー階層に一致しない先頭側のラベルを起点とする', () => {
    // Given: 準備(画像1: マイファイル > ■勉強会資料 > 問題無いか)
    const segments = toSegments('マイファイル', ['■勉強会資料', '問題無いか']);

    // When/Then: 実行と検証
    expect(
      selectRootLabel(['マイファイル', '■勉強会資料', '問題無いか'], segments)
    ).toBe('マイファイル');
  });

  it('階層が深く起点が折りたたまれている場合、先頭のフォルダー名を起点とせずnullを返す', () => {
    // Given: 準備(画像2: 📁 > ■勉強会資料 > 問題無いか > 確認してください。 > いいですか？)
    const folders = [
      '■勉強会資料',
      '問題無いか',
      '確認してください。',
      'いいですか？',
    ];
    const segments = toSegments('マイファイル', folders);

    // When/Then: 実行と検証
    expect(selectRootLabel(folders, segments)).toBeNull();
  });

  it('途中の階層まで折りたたまれている場合もnullを返す', () => {
    // Given: 準備(📁 > 確認してください。 > いいですか？)
    const segments = toSegments('マイファイル', [
      '■勉強会資料',
      '問題無いか',
      '確認してください。',
      'いいですか？',
    ]);

    // When/Then: 実行と検証
    expect(
      selectRootLabel(['確認してください。', 'いいですか？'], segments)
    ).toBeNull();
  });

  it('SharePointでサイト名とライブラリ名が並ぶ場合、先頭(サイト名)を起点とする', () => {
    // Given: 準備(URL上の起点はライブラリ名"Shared Documents"、UI上の表示名は"ドキュメント")
    const segments = toSegments('Shared Documents', ['2025年度']);

    // When/Then: 実行と検証
    expect(
      selectRootLabel(['営業部サイト', 'ドキュメント', '2025年度'], segments)
    ).toBe('営業部サイト');
  });

  it('起点フォルダーを開いている(フォルダー階層が無い)場合、先頭のラベルを起点とする', () => {
    // When/Then: 実行と検証
    expect(
      selectRootLabel(['マイファイル'], toSegments('マイファイル', []))
    ).toBe('マイファイル');
  });

  it('フォルダー名が起点と同じ名前でも、末尾照合が完全なら先頭側の余りを起点とする', () => {
    // Given: 準備(マイファイル > マイファイル という名前のフォルダー)
    const segments = toSegments('マイファイル', ['マイファイル']);

    // When/Then: 実行と検証
    expect(selectRootLabel(['マイファイル', 'マイファイル'], segments)).toBe(
      'マイファイル'
    );
  });

  it('DOMとURLの対応が想定外で、余りの先頭がフォルダー名と一致する場合はnullを返す', () => {
    // Given: 準備(現在のフォルダー名がURLとUIで異なり末尾照合できない)
    const segments = toSegments('マイファイル', ['■勉強会資料', '問題無いか']);

    // When/Then: 実行と検証
    expect(
      selectRootLabel(['■勉強会資料', '問題無いか(表示名)'], segments)
    ).toBeNull();
  });

  it('パンくずUIのラベルが無い場合はnullを返す', () => {
    // When/Then: 実行と検証
    expect(selectRootLabel([], toSegments('マイファイル', ['A']))).toBeNull();
  });
});

describe('readBreadcrumbRootLabel', () => {
  it('DOMから全ラベルを読み、照合して起点ラベルを返す', () => {
    // Given: 準備
    const segments = toSegments('マイファイル', ['■勉強会資料']);
    const root = createRoot(crumbsHtml(['マイファイル', '■勉強会資料']));

    // When/Then: 実行と検証
    expect(readBreadcrumbRootLabel(root, segments)).toBe('マイファイル');
  });

  it('例外を投げない', () => {
    // When/Then: 実行と検証
    expect(() =>
      readBreadcrumbRootLabel(createRoot(''), toSegments('マイファイル', []))
    ).not.toThrow();
  });
});
