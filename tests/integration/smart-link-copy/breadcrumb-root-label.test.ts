// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  buildAncestorFolders,
  replaceRootLabel,
  resolvePageContext,
} from '../../../src/content/FolderPathResolver';
import { readBreadcrumbRootLabel } from '../../../src/content/BreadcrumbRootLabelReader';
import { buildBreadcrumbResult } from '../../../src/content/BreadcrumbBuilder';

function createDom(html: string): Document {
  const doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = html;
  return doc;
}

// 実機のOneDriveページから取得した実際のパンくずDOM構造に基づく
const ONEDRIVE_BREADCRUMB_HTML = `
  <ol data-automationid="breadcrumb-root-id">
    <li data-automationid="breadcrumb-listitem">
      <h1>
        <button data-automationid="breadcrumb-crumb" aria-haspopup="menu">
          <span title="マイファイル" class="breadcrumbTextItem_e8d4563a" style="max-width: 158px;">マイファイル</span>
        </button>
      </h1>
    </li>
  </ol>
`;

describe('Smart Link Copy(パンくずUIからの起点ラベル取得)', () => {
  it('OneDriveの実際のパンくずDOMから「マイファイル」を取得し、起点として使う', () => {
    // Given: 準備
    const url =
      'https://onedrive.live.com/my?id=' +
      encodeURIComponent(
        '/personal/00d5c5517f1d115b/Documents/◆自己紹介/20250108_トリセツ'
      );
    const dom = createDom(ONEDRIVE_BREADCRUMB_HTML);

    // When: 実行
    const context = resolvePageContext(url);
    let segments = buildAncestorFolders(context!);
    const rootLabel = readBreadcrumbRootLabel(dom, segments);
    if (rootLabel) {
      segments = replaceRootLabel(segments, rootLabel);
    }
    const result = buildBreadcrumbResult(segments);

    // Then: 検証
    expect(rootLabel).toBe('マイファイル');
    expect(result.text).toBe('マイファイル > ◆自己紹介 > 20250108_トリセツ');
  });

  it('SharePointでパンくずの先頭がサイト名の場合、起点がドキュメントライブラリ名ではなくサイト名になる', () => {
    // Given: 準備(ドキュメントライブラリ名は"Documents"だが、パンくずの先頭はサイト名)
    const url =
      'https://contoso.sharepoint.com/sites/Sales/Documents/Forms/AllItems.aspx?id=' +
      encodeURIComponent('/sites/Sales/Documents/2025年度/議事録');
    const dom = createDom(
      '<button data-automationid="breadcrumb-crumb"><span title="営業部サイト">営業部サイト</span></button>' +
        '<button data-automationid="breadcrumb-crumb"><span title="2025年度">2025年度</span></button>' +
        '<button data-automationid="breadcrumb-crumb"><span title="議事録">議事録</span></button>'
    );

    // When: 実行
    const context = resolvePageContext(url);
    let segments = buildAncestorFolders(context!);
    const rootLabel = readBreadcrumbRootLabel(dom, segments);
    if (rootLabel) {
      segments = replaceRootLabel(segments, rootLabel);
    }
    const result = buildBreadcrumbResult(segments);

    // Then: 検証
    expect(rootLabel).toBe('営業部サイト');
    expect(result.text).toBe('営業部サイト > 2025年度 > 議事録');
    expect(result.segments[0].url).toBeNull();
  });

  it('パンくずUIから取得できない場合、従来通りURLベースの起点(ドキュメントライブラリ名)のままになる', () => {
    // Given: 準備(パンくずDOMが見つからない)
    const url =
      'https://contoso.sharepoint.com/sites/Sales/Documents/Forms/AllItems.aspx?id=' +
      encodeURIComponent('/sites/Sales/Documents/2025年度');
    const dom = createDom('<div>パンくずは見つからない</div>');

    // When: 実行
    const context = resolvePageContext(url);
    let segments = buildAncestorFolders(context!);
    const rootLabel = readBreadcrumbRootLabel(dom, segments);
    if (rootLabel) {
      segments = replaceRootLabel(segments, rootLabel);
    }
    const result = buildBreadcrumbResult(segments);

    // Then: 検証
    expect(rootLabel).toBeNull();
    expect(result.text).toBe('Documents > 2025年度');
  });

  it('階層が深くパンくずUIの起点側が折りたたまれている場合、先頭の可視フォルダーを起点と誤認せず、URLベースの起点からのパンくずになる', () => {
    // Given: 準備(📁(オーバーフロー。breadcrumb-crumbではない) > ■勉強会資料 > 問題無いか > 確認してください。 > いいですか？)
    const url =
      'https://onedrive.live.com/my?id=' +
      encodeURIComponent(
        '/personal/00d5c5517f1d115b/Documents/■勉強会資料/問題無いか/確認してください。/いいですか？'
      );
    const dom = createDom(`
      <ol data-automationid="breadcrumb-root-id">
        <li><button aria-label="その他の項目"><i data-icon-name="FabricFolder"></i></button></li>
        <li><button data-automationid="breadcrumb-crumb"><span title="■勉強会資料">■勉強会...</span></button></li>
        <li><button data-automationid="breadcrumb-crumb"><span title="問題無いか">問題無いか</span></button></li>
        <li><button data-automationid="breadcrumb-crumb"><span title="確認してください。">確認して...</span></button></li>
        <li><h1><button data-automationid="breadcrumb-crumb"><span title="いいですか？">いいですか？</span></button></h1></li>
      </ol>
    `);

    // When: 実行
    const context = resolvePageContext(url);
    let segments = buildAncestorFolders(context!);
    const rootLabel = readBreadcrumbRootLabel(dom, segments);
    if (rootLabel) {
      segments = replaceRootLabel(segments, rootLabel);
    }
    const result = buildBreadcrumbResult(segments);

    // Then: 検証
    expect(rootLabel).toBeNull();
    expect(result.text).toBe(
      'マイファイル > ■勉強会資料 > 問題無いか > 確認してください。 > いいですか？'
    );
  });
});
