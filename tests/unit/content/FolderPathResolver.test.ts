import { describe, it, expect } from 'vitest';
import {
  resolvePageContext,
  buildAncestorFolders,
  replaceRootLabel,
} from '../../../src/content/FolderPathResolver';

const ONEDRIVE_URL =
  'https://onedrive.live.com/my?id=%2Fpersonal%2F00d5c5517f1d115b%2FDocuments%2F%E2%96%A0%E5%8B%89%E5%BC%B7%E4%BC%9A%E8%B3%87%E6%96%99%2F%5Fold&viewid=2a6deb66%2D3a2f%2D4309%2Db04f%2Dd0cc7d8819f7';

const SHAREPOINT_URL =
  'https://contoso.sharepoint.com/sites/TeamA/Documents/Forms/AllItems.aspx?id=%2Fsites%2FTeamA%2FDocuments%2FProjectX%2FDesign';

describe('FolderPathResolver', () => {
  describe('resolvePageContext', () => {
    it('OneDriveのURLからPageContextを解決できる', () => {
      // Given: 準備
      const url = ONEDRIVE_URL;

      // When: 実行
      const context = resolvePageContext(url);

      // Then: 検証
      expect(context).not.toBeNull();
      expect(context?.siteType).toBe('onedrive-personal');
      expect(context?.idParam).toBe(
        '/personal/00d5c5517f1d115b/Documents/■勉強会資料/_old'
      );
      expect(context?.viewId).toBe('2a6deb66-3a2f-4309-b04f-d0cc7d8819f7');
    });

    it('SharePointチームサイトのURLからPageContextを解決できる', () => {
      // Given: 準備
      const url = SHAREPOINT_URL;

      // When: 実行
      const context = resolvePageContext(url);

      // Then: 検証
      expect(context).not.toBeNull();
      expect(context?.siteType).toBe('sharepoint-site');
      expect(context?.idParam).toBe('/sites/TeamA/Documents/ProjectX/Design');
    });

    it('idパラメータが存在しない場合はnullを返す', () => {
      // Given: 準備
      const url = 'https://onedrive.live.com/my';

      // When: 実行
      const context = resolvePageContext(url);

      // Then: 検証
      expect(context).toBeNull();
    });

    it('SharePoint/OneDrive以外のホストの場合はnullを返す', () => {
      // Given: 準備
      const url = 'https://example.com/?id=%2Ffoo';

      // When: 実行
      const context = resolvePageContext(url);

      // Then: 検証
      expect(context).toBeNull();
    });

    it('不正なURL文字列の場合はnullを返す', () => {
      // Given: 準備
      const url = 'not-a-valid-url';

      // When: 実行
      const context = resolvePageContext(url);

      // Then: 検証
      expect(context).toBeNull();
    });
  });

  describe('buildAncestorFolders', () => {
    it('OneDriveの場合、マイファイルを起点にpersonal/<userId>/Documentsをスキップする', () => {
      // Given: 準備
      const context = resolvePageContext(ONEDRIVE_URL)!;

      // When: 実行
      const segments = buildAncestorFolders(context);

      // Then: 検証
      expect(segments.map((s) => s.label)).toEqual([
        'マイファイル',
        '■勉強会資料',
        '_old',
      ]);
      expect(segments[0].url).toBeNull();
    });

    it('OneDriveの各フォルダーセグメントに実URLが付与される', () => {
      // Given: 準備
      const context = resolvePageContext(ONEDRIVE_URL)!;

      // When: 実行
      const segments = buildAncestorFolders(context);

      // Then: 検証
      // URLSearchParams.get() は取得時に自動で1回デコードするため、追加のdecodeURIComponent()は
      // 呼ばない(重ねて呼ぶと二重デコードになり、二重エンコードのバグを見逃してしまう)
      const folderUrl = new URL(segments[1].url!);
      expect(folderUrl.searchParams.get('id')).toBe(
        '/personal/00d5c5517f1d115b/Documents/■勉強会資料'
      );

      const nestedFolderUrl = new URL(segments[2].url!);
      expect(nestedFolderUrl.searchParams.get('id')).toBe(
        '/personal/00d5c5517f1d115b/Documents/■勉強会資料/_old'
      );

      // 二重エンコード(例: %2F が %252F になる)が発生していないことを、生の文字列でも確認する
      expect(segments[1].url).not.toContain('%25');
      expect(segments[1].url).toBe(
        'https://onedrive.live.com/my?id=%2Fpersonal%2F00d5c5517f1d115b%2FDocuments%2F%E2%96%A0%E5%8B%89%E5%BC%B7%E4%BC%9A%E8%B3%87%E6%96%99&viewid=2a6deb66-3a2f-4309-b04f-d0cc7d8819f7'
      );
    });

    it('SharePointの場合、サイトパスを除きドキュメントライブラリ名を起点にする', () => {
      // Given: 準備
      const context = resolvePageContext(SHAREPOINT_URL)!;

      // When: 実行
      const segments = buildAncestorFolders(context);

      // Then: 検証
      expect(segments.map((s) => s.label)).toEqual([
        'Documents',
        'ProjectX',
        'Design',
      ]);
      expect(segments[0].url).toBeNull();
    });

    it('SharePointでFormsセグメントが見つからない場合は先頭セグメントを起点にフォールバックする', () => {
      // Given: 準備
      const context = resolvePageContext(
        'https://contoso.sharepoint.com/sites/TeamA/SitePages/Home.aspx?id=%2FShared%2520Documents%2FProjectX'
      )!;

      // When: 実行
      const segments = buildAncestorFolders(context);

      // Then: 検証
      expect(segments.map((s) => s.label)).toEqual([
        'Shared Documents',
        'ProjectX',
      ]);
    });
  });

  describe('replaceRootLabel', () => {
    it('先頭セグメントのラベルのみを置き換え、urlはnullのままにする', () => {
      // Given: 準備
      const context = resolvePageContext(SHAREPOINT_URL)!;
      const segments = buildAncestorFolders(context);

      // When: 実行
      const result = replaceRootLabel(segments, '営業部サイト');

      // Then: 検証
      expect(result[0]).toEqual({ label: '営業部サイト', url: null });
      expect(result.slice(1)).toEqual(segments.slice(1));
    });

    it('元の配列を変更しない', () => {
      // Given: 準備
      const context = resolvePageContext(SHAREPOINT_URL)!;
      const segments = buildAncestorFolders(context);
      const originalLabel = segments[0].label;

      // When: 実行
      replaceRootLabel(segments, '営業部サイト');

      // Then: 検証
      expect(segments[0].label).toBe(originalLabel);
    });

    it('空配列を渡した場合はそのまま返す', () => {
      // Given/When: 準備と実行
      const result = replaceRootLabel([], '営業部サイト');

      // Then: 検証
      expect(result).toEqual([]);
    });
  });
});
