import { describe, it, expect } from 'vitest';
import {
  buildAncestorFolders,
  resolvePageContext,
} from '../../../src/content/FolderPathResolver';
import { buildBreadcrumbResult } from '../../../src/content/BreadcrumbBuilder';

describe('Smart Link Copy(現在地のパンくずコピー)', () => {
  it('OneDriveで現在表示しているフォルダーのURLから、そのままパンくずを生成できる', () => {
    // Given: 準備(「マイファイル > ■勉強会資料」フォルダーを表示している状態のURL)
    const url =
      'https://onedrive.live.com/my?id=%2Fpersonal%2F00d5c5517f1d115b%2FDocuments%2F%E2%96%A0%E5%8B%89%E5%BC%B7%E4%BC%9A%E8%B3%87%E6%96%99';

    // When: 実行(URL解析 → パンくず生成。DOM検知は一切行わない)
    const context = resolvePageContext(url);
    const segments = buildAncestorFolders(context!);
    const result = buildBreadcrumbResult(segments);

    // Then: 検証(右クリック対象を問わず、現在地のパンくずのみが生成される)
    expect(result.text).toBe('マイファイル > ■勉強会資料');
    expect(result.segments[0].url).toBeNull();
    // 二重URLエンコード(%2F が %252F になる不具合)が発生していないことを、実際のOneDriveの
    // URL形式(単一エンコード)と完全一致することで確認する
    expect(result.segments[1].url).toBe(
      'https://onedrive.live.com/my?id=%2Fpersonal%2F00d5c5517f1d115b%2FDocuments%2F%E2%96%A0%E5%8B%89%E5%BC%B7%E4%BC%9A%E8%B3%87%E6%96%99'
    );
    expect(result.html).toBe(
      `マイファイル > <a href="${result.segments[1].url}">■勉強会資料</a>`
    );
  });

  it('さらに1階層下のフォルダーを表示している場合、そこまでのパンくずになる', () => {
    // Given: 準備(「マイファイル > ■勉強会資料 > _old」フォルダーを表示している状態のURL)
    const url =
      'https://onedrive.live.com/my?id=%2Fpersonal%2F00d5c5517f1d115b%2FDocuments%2F%E2%96%A0%E5%8B%89%E5%BC%B7%E4%BC%9A%E8%B3%87%E6%96%99%2F%5Fold';

    // When: 実行
    const context = resolvePageContext(url);
    const segments = buildAncestorFolders(context!);
    const result = buildBreadcrumbResult(segments);

    // Then: 検証
    expect(result.text).toBe('マイファイル > ■勉強会資料 > _old');
  });

  it('SharePointチームサイトの場合も同様に現在地のパンくずを生成できる', () => {
    // Given: 準備
    const url =
      'https://contoso.sharepoint.com/sites/TeamA/Documents/Forms/AllItems.aspx?id=%2Fsites%2FTeamA%2FDocuments%2FProjectX';

    // When: 実行
    const context = resolvePageContext(url);
    const segments = buildAncestorFolders(context!);
    const result = buildBreadcrumbResult(segments);

    // Then: 検証
    expect(result.text).toBe('Documents > ProjectX');
  });

  it('選択アイテムがある場合、パンくずの下に「　┗ 名前」を1件1行で追加する(ユーザー指定フォーマット)', () => {
    // Given: 準備(「マイファイル > ◆自己紹介 > 20250108_トリセツ」を開き、2件を選択している状態)
    const url =
      'https://onedrive.live.com/my?id=' +
      encodeURIComponent(
        '/personal/00d5c5517f1d115b/Documents/◆自己紹介/20250108_トリセツ'
      );
    const selectedItems = [
      '20231122_近況報告_DED_山田太郎.pptx',
      'Cropped_Image.png',
    ];

    // When: 実行
    const context = resolvePageContext(url);
    const segments = buildAncestorFolders(context!);
    const result = buildBreadcrumbResult(segments, selectedItems);

    // Then: 検証(ユーザーが指定したペースト結果と完全一致。行頭は全角スペース+┗+半角スペース)
    expect(result.text).toBe(
      [
        'マイファイル > ◆自己紹介 > 20250108_トリセツ',
        '　┗ 20231122_近況報告_DED_山田太郎.pptx',
        '　┗ Cropped_Image.png',
      ].join('\n')
    );
    expect(result.html.split('<br>')).toHaveLength(3);
    expect(result.html).toContain('<br>　┗ Cropped_Image.png');
  });

  it('選択アイテムが無い場合は、従来通りパンくずのみ(改行なし)になる', () => {
    // Given: 準備
    const url =
      'https://onedrive.live.com/my?id=' +
      encodeURIComponent('/personal/00d5c5517f1d115b/Documents/◆自己紹介');

    // When: 実行
    const context = resolvePageContext(url);
    const result = buildBreadcrumbResult(buildAncestorFolders(context!), []);

    // Then: 検証
    expect(result.text).toBe('マイファイル > ◆自己紹介');
  });
});
