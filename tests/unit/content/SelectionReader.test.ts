// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readSelectedItemNames } from '../../../src/content/SelectionReader';

function createRoot(html: string): HTMLElement {
  const doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = html;
  return doc.body;
}

describe('readSelectedItemNames', () => {
  it('選択されている行のアイテム名だけを表示順に返す', () => {
    // Given: 準備(4行のうち1行目と3行目が選択されている)
    const root = createRoot(`
      <div role="row" aria-selected="true">
        <div role="gridcell"><span data-automationid="name">20231122_近況報告_DED_山田太郎.pptx</span></div>
      </div>
      <div role="row" aria-selected="false">
        <div role="gridcell"><span data-automationid="name">Cropped_Image (1).png</span></div>
      </div>
      <div role="row" aria-selected="true">
        <div role="gridcell"><span data-automationid="name">Cropped_Image.png</span></div>
      </div>
      <div role="row">
        <div role="gridcell"><span data-automationid="name">笑顔.png</span></div>
      </div>
    `);

    // When: 実行
    const names = readSelectedItemNames(root);

    // Then: 検証
    expect(names).toEqual([
      '20231122_近況報告_DED_山田太郎.pptx',
      'Cropped_Image.png',
    ]);
  });

  it('選択されている行が無い場合は空配列を返す', () => {
    // Given: 準備
    const root = createRoot(`
      <div role="row" aria-selected="false"><div role="gridcell">a.png</div></div>
    `);

    // When/Then: 実行と検証
    expect(readSelectedItemNames(root)).toEqual([]);
  });

  it('ヘッダー行(columnheaderを含む行)は選択扱いにしない', () => {
    // Given: 準備(すべて選択状態のヘッダー行)
    const root = createRoot(`
      <div role="row" aria-selected="true">
        <div role="columnheader">名前</div>
      </div>
      <div role="row" aria-selected="true">
        <div role="gridcell">資料.pptx</div>
      </div>
    `);

    // When: 実行
    const names = readSelectedItemNames(root);

    // Then: 検証
    expect(names).toEqual(['資料.pptx']);
  });

  it('選択行の外にある無関係な要素(バナー等)のテキストは拾わない', () => {
    // Given: 準備
    const root = createRoot(`
      <div>追加のストレージを取得</div>
      <div role="row" aria-selected="true"><div role="gridcell">資料.pptx</div></div>
    `);

    // When: 実行
    const names = readSelectedItemNames(root);

    // Then: 検証
    expect(names).toEqual(['資料.pptx']);
  });

  describe('名前の取得方法(フォールバック)', () => {
    it('既知の属性を持つ要素があれば、その名前を優先する', () => {
      // Given: 準備(先頭のセルには別のテキストがあるが、名前用の属性を優先する)
      const root = createRoot(`
        <div role="row" aria-selected="true">
          <div role="gridcell">選択済み</div>
          <div role="gridcell"><span data-automationid="field-LinkFilename">資料.pptx</span></div>
        </div>
      `);

      // When/Then: 実行と検証
      expect(readSelectedItemNames(root)).toEqual(['資料.pptx']);
    });

    it('既知の属性が無い場合、テキストを持つ最初のgridcellの名前を使う(空のセルはスキップ)', () => {
      // Given: 準備(先頭はチェックボックス/アイコンのみで空のセル)
      const root = createRoot(`
        <div role="row" aria-selected="true">
          <div role="gridcell"><input type="checkbox" /></div>
          <div role="gridcell">資料.pptx</div>
          <div role="gridcell">2025年1月7日</div>
        </div>
      `);

      // When/Then: 実行と検証
      expect(readSelectedItemNames(root)).toEqual(['資料.pptx']);
    });

    it('拡張子が別の要素に分かれていても連結して取得する', () => {
      // Given: 準備
      const root = createRoot(`
        <div role="row" aria-selected="true">
          <div role="gridcell"><span>20231122_近況報告</span><span>.pptx</span></div>
        </div>
      `);

      // When/Then: 実行と検証
      expect(readSelectedItemNames(root)).toEqual(['20231122_近況報告.pptx']);
    });

    it('gridcellが無い場合は、行内の最初の非空テキストを使う(aria-hiddenは除く)', () => {
      // Given: 準備
      const root = createRoot(`
        <div role="row" aria-selected="true">
          <span aria-hidden="true">隠しテキスト</span>
          <span>  </span>
          <span>資料.pptx</span>
          <span>2025年1月7日</span>
        </div>
      `);

      // When/Then: 実行と検証
      expect(readSelectedItemNames(root)).toEqual(['資料.pptx']);
    });

    it('data-selection-indexを持つ要素も選択行として扱う', () => {
      // Given: 準備
      const root = createRoot(`
        <div data-selection-index="0" aria-selected="true"><span>資料.pptx</span></div>
      `);

      // When/Then: 実行と検証
      expect(readSelectedItemNames(root)).toEqual(['資料.pptx']);
    });
  });

  describe('名前の正規化・重複', () => {
    it('前後の空白・改行を除き、全角スペースを含む名前はそのまま保つ', () => {
      // Given: 準備
      const root = createRoot(`
        <div role="row" aria-selected="true">
          <div role="gridcell">
            報告${'　'}資料.pptx
          </div>
        </div>
      `);

      // When/Then: 実行と検証
      expect(readSelectedItemNames(root)).toEqual(['報告　資料.pptx']);
    });

    it('入れ子で複数マッチした場合は最外殻の1件だけを数える', () => {
      // Given: 準備(外側がdata-selection-index、内側がrole="row"で両方選択状態)
      const root = createRoot(`
        <div data-selection-index="0" aria-selected="true">
          <div role="row" aria-selected="true"><div role="gridcell">資料.pptx</div></div>
        </div>
      `);

      // When/Then: 実行と検証
      expect(readSelectedItemNames(root)).toEqual(['資料.pptx']);
    });

    it('同じ名前は重複させない', () => {
      // Given: 準備
      const root = createRoot(`
        <div role="row" aria-selected="true"><div role="gridcell">a.png</div></div>
        <div role="row" aria-selected="true"><div role="gridcell">a.png</div></div>
      `);

      // When/Then: 実行と検証
      expect(readSelectedItemNames(root)).toEqual(['a.png']);
    });
  });

  it('名前を取得できない選択行は除外し、例外を投げない', () => {
    // Given: 準備(テキストを一切持たない選択行)
    const root = createRoot(`
      <div role="row" aria-selected="true"><div role="gridcell"><input type="checkbox" /></div></div>
    `);

    // When/Then: 実行と検証
    expect(() => readSelectedItemNames(root)).not.toThrow();
    expect(readSelectedItemNames(root)).toEqual([]);
  });
});
