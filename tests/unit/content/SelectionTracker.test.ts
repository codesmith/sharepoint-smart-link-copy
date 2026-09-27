// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { SelectionTracker } from '../../../src/content/SelectionTracker';

function createDocument(): Document {
  const doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = `
    <div id="row1" role="row" aria-selected="true"><div role="gridcell">a.pptx</div></div>
    <div id="row2" role="row" aria-selected="true"><div role="gridcell">b.png</div></div>
    <div id="blank"></div>
  `;
  return doc;
}

function rightMouseDown(target: Element): void {
  target.dispatchEvent(
    new MouseEvent('mousedown', { button: 2, bubbles: true })
  );
}

function contextMenu(target: Element): void {
  target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
}

describe('SelectionTracker', () => {
  it('右クリックされるまでは null を返す', () => {
    // Given: 準備
    const tracker = new SelectionTracker();
    tracker.attach(createDocument());

    // When/Then: 実行と検証
    expect(tracker.getSnapshot()).toBeNull();
  });

  it('右クリック時点の選択アイテム名をスナップショットする', () => {
    // Given: 準備
    const doc = createDocument();
    const tracker = new SelectionTracker();
    tracker.attach(doc);
    const blank = doc.getElementById('blank')!;

    // When: 実行
    rightMouseDown(blank);
    contextMenu(blank);

    // Then: 検証
    expect(tracker.getSnapshot()).toEqual(['a.pptx', 'b.png']);
  });

  it('右クリックのmousedownでページ側が選択を解除しても、解除前の選択を保持する', () => {
    // Given: 準備(mousedown後、contextmenuまでの間に選択が解除されるUIを再現)
    const doc = createDocument();
    const tracker = new SelectionTracker();
    tracker.attach(doc);
    const blank = doc.getElementById('blank')!;

    // When: 実行
    rightMouseDown(blank);
    doc
      .querySelectorAll('[aria-selected]')
      .forEach((row) => row.setAttribute('aria-selected', 'false'));
    contextMenu(blank);

    // Then: 検証
    expect(tracker.getSnapshot()).toEqual(['a.pptx', 'b.png']);
  });

  it('左クリックのmousedownはスナップショットに使わない(contextmenu時点の選択を読む)', () => {
    // Given: 準備
    const doc = createDocument();
    const tracker = new SelectionTracker();
    tracker.attach(doc);
    const blank = doc.getElementById('blank')!;

    // When: 実行(左クリックで全解除した後にcontextmenuだけが発火する: Ctrl+クリック等の経路)
    blank.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, bubbles: true })
    );
    doc.getElementById('row1')!.setAttribute('aria-selected', 'false');
    contextMenu(blank);

    // Then: 検証
    expect(tracker.getSnapshot()).toEqual(['b.png']);
  });

  it('次の右クリックでは、前回のスナップショットを引き継がず新しい選択を読む', () => {
    // Given: 準備
    const doc = createDocument();
    const tracker = new SelectionTracker();
    tracker.attach(doc);
    const blank = doc.getElementById('blank')!;
    rightMouseDown(blank);
    contextMenu(blank);

    // When: 実行(選択を変更してから、もう一度右クリック)
    doc.getElementById('row2')!.setAttribute('aria-selected', 'false');
    rightMouseDown(blank);
    contextMenu(blank);

    // Then: 検証
    expect(tracker.getSnapshot()).toEqual(['a.pptx']);
  });
});
