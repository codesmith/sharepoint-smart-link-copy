import { readSelectedItemNames } from './SelectionReader.js';

const SECONDARY_MOUSE_BUTTON = 2;

// 右クリックによってSharePoint/OneDrive側が選択を解除する可能性があるため、ページ側の処理より前
// (captureフェーズ)の選択状態をスナップショットして保持する。右クリックのmousedownはcontextmenuより
// 先に発生するため、まずmousedown時点の選択を控え、contextmenuで確定する。
export class SelectionTracker {
  private pendingSnapshot: string[] | null = null;
  private lastSnapshot: string[] | null = null;

  attach(doc: Document = document): void {
    doc.addEventListener(
      'mousedown',
      (event) => {
        if (event.button === SECONDARY_MOUSE_BUTTON) {
          this.pendingSnapshot = readSelectedItemNames(doc);
        }
      },
      { capture: true }
    );

    doc.addEventListener(
      'contextmenu',
      () => {
        this.lastSnapshot = this.pendingSnapshot ?? readSelectedItemNames(doc);
        this.pendingSnapshot = null;
      },
      { capture: true }
    );
  }

  getSnapshot(): string[] | null {
    return this.lastSnapshot;
  }
}
