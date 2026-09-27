import { describe, it, expect } from 'vitest';
import {
  buildBreadcrumbResult,
  escapeHtml,
} from '../../../src/content/BreadcrumbBuilder';
import type { BreadcrumbSegment } from '../../../src/shared/types';

const segments: BreadcrumbSegment[] = [
  { label: 'マイファイル', url: null },
  {
    label: '■勉強会資料',
    url: 'https://onedrive.live.com/my?id=%2Fpersonal%2F00d5c5517f1d115b%2FDocuments%2F%E2%96%A0%E5%8B%89%E5%BC%B7%E4%BC%9A%E8%B3%87%E6%96%99',
  },
  {
    label: '_old',
    url: 'https://onedrive.live.com/my?id=%2Fpersonal%2F00d5c5517f1d115b%2FDocuments%2F%E2%96%A0%E5%8B%89%E5%BC%B7%E4%BC%9A%E8%B3%87%E6%96%99%2F_old',
  },
];

describe('escapeHtml', () => {
  it('HTML特殊文字をエスケープする', () => {
    // Given: 準備
    const input = `<script>alert("x")</script>&'`;

    // When: 実行
    const result = escapeHtml(input);

    // Then: 検証
    expect(result).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;'
    );
  });
});

describe('buildBreadcrumbResult', () => {
  describe('選択アイテムなし', () => {
    it('セグメントを" > "区切りのプレーンテキストに変換する', () => {
      // Given/When: 準備と実行
      const result = buildBreadcrumbResult(segments);

      // Then: 検証
      expect(result.text).toBe('マイファイル > ■勉強会資料 > _old');
      expect(result.selectedItems).toEqual([]);
    });

    it('リンクを持つセグメントは<a href>に、持たないセグメントはプレーンテキストになる', () => {
      // Given/When: 準備と実行
      const result = buildBreadcrumbResult(segments);

      // Then: 検証
      expect(result.html).toBe(
        `マイファイル > <a href="${segments[1].url}">■勉強会資料</a> > <a href="${segments[2].url}">_old</a>`
      );
    });

    it('選択アイテムが空配列の場合、改行や空行を付けない', () => {
      // Given/When: 準備と実行
      const result = buildBreadcrumbResult(segments, []);

      // Then: 検証
      expect(result.text).not.toContain('\n');
      expect(result.html).not.toContain('<br>');
    });

    it('ラベルにHTML特殊文字が含まれる場合、htmlはエスケープされる', () => {
      // Given: 準備
      const target: BreadcrumbSegment[] = [
        { label: '<注意>資料&メモ', url: null },
      ];

      // When: 実行
      const result = buildBreadcrumbResult(target);

      // Then: 検証
      expect(result.html).toBe('&lt;注意&gt;資料&amp;メモ');
    });

    it('空の配列を渡した場合、空文字を返す', () => {
      // Given/When: 準備と実行
      const result = buildBreadcrumbResult([]);

      // Then: 検証
      expect(result.text).toBe('');
      expect(result.html).toBe('');
    });
  });

  describe('選択アイテムあり', () => {
    const items = ['20231122_近況報告_DED_山田太郎.pptx', 'Cropped_Image.png'];

    it('textは2行目以降に「全角スペース+┗+半角スペース」付きでアイテムを1件1行で並べる', () => {
      // Given/When: 準備と実行
      const result = buildBreadcrumbResult(segments, items);

      // Then: 検証
      expect(result.text).toBe(
        [
          'マイファイル > ■勉強会資料 > _old',
          '　┗ 20231122_近況報告_DED_山田太郎.pptx',
          '　┗ Cropped_Image.png',
        ].join('\n')
      );
      expect(result.selectedItems).toEqual(items);
    });

    it('htmlはパンくずの後に<br>区切りでアイテム行を並べ、アイテムはリンクにしない', () => {
      // Given/When: 準備と実行
      const result = buildBreadcrumbResult(segments, items);

      // Then: 検証
      expect(result.html).toBe(
        `マイファイル > <a href="${segments[1].url}">■勉強会資料</a> > <a href="${segments[2].url}">_old</a>` +
          '<br>　┗ 20231122_近況報告_DED_山田太郎.pptx' +
          '<br>　┗ Cropped_Image.png'
      );
    });

    it('1件だけ選択した場合も同じ形式で出力する', () => {
      // Given/When: 準備と実行
      const result = buildBreadcrumbResult(segments, ['資料.pptx']);

      // Then: 検証
      expect(result.text).toBe(
        'マイファイル > ■勉強会資料 > _old\n　┗ 資料.pptx'
      );
    });

    it('アイテム名にHTML特殊文字が含まれる場合、htmlはエスケープされ、textはそのまま', () => {
      // Given: 準備
      const target = ['<注意>資料&メモ.pptx'];

      // When: 実行
      const result = buildBreadcrumbResult(segments, target);

      // Then: 検証
      expect(result.html).toContain('　┗ &lt;注意&gt;資料&amp;メモ.pptx');
      expect(result.html).not.toContain('<注意>');
      expect(result.text).toContain('　┗ <注意>資料&メモ.pptx');
    });
  });
});
