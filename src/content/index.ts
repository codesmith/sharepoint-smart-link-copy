import { buildBreadcrumbResult } from './BreadcrumbBuilder.js';
import { ClipboardWriter } from './ClipboardWriter.js';
import {
  buildAncestorFolders,
  resolvePageContext,
} from './FolderPathResolver.js';
import { readSelectedItemNames } from './SelectionReader.js';
import { SelectionTracker } from './SelectionTracker.js';
import { BreadcrumbResolutionError } from '../shared/errors.js';
import { SMART_LINK_COPY_MESSAGE } from '../shared/messages.js';

const clipboardWriter = new ClipboardWriter();
const selectionTracker = new SelectionTracker();

const TOAST_ELEMENT_ID = 'smart-link-copy-error-toast';
const TOAST_DISPLAY_DURATION_MS = 4000;

function showErrorToast(message: string): void {
  document.getElementById(TOAST_ELEMENT_ID)?.remove();

  const toast = document.createElement('div');
  toast.id = TOAST_ELEMENT_ID;
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.right = '16px';
  toast.style.bottom = '16px';
  toast.style.zIndex = '2147483647';
  toast.style.padding = '8px 16px';
  toast.style.borderRadius = '4px';
  toast.style.backgroundColor = '#323130';
  toast.style.color = '#ffffff';
  toast.style.fontSize = '14px';

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), TOAST_DISPLAY_DURATION_MS);
}

// 右クリック位置の対象(ファイル/フォルダー行)は検知しない。SharePoint/OneDriveは行の右クリックに
// 独自のコンテキストメニューを表示し、ブラウザのネイティブメニュー(拡張機能のメニュー項目を含む)を
// 抑制してしまうため、行単位の検知に依存しない設計とする。代わりに「現在表示しているページ = どの
// フォルダーを見ているか」をアドレスバーURLから読み取り、そのままパンくずとしてコピーする。
// 加えて、右クリック対象ではなく「選択されているアイテム」(選択状態は独自メニューの影響を受けない)の
// 名前を、右クリック直前のスナップショットから取得してパンくずの下に列挙する。
export async function runSmartLinkCopy(): Promise<void> {
  try {
    const context = resolvePageContext(window.location.href);
    if (!context) {
      throw new BreadcrumbResolutionError(
        'フォルダー階層を取得できませんでした',
        'url-parse-failed'
      );
    }

    const segments = buildAncestorFolders(context);
    const selectedItems =
      selectionTracker.getSnapshot() ?? readSelectedItemNames(document);
    // 実機でDOM構造が想定と異なり選択アイテムを取得できない場合の切り分け用
    console.debug('[Smart Link Copy] 選択アイテム', selectedItems);

    const result = buildBreadcrumbResult(segments, selectedItems);
    await clipboardWriter.write(result);
  } catch (error) {
    if (error instanceof BreadcrumbResolutionError) {
      showErrorToast('Smart Link Copyに失敗しました。もう一度お試しください');
      return;
    }
    throw error;
  }
}

export function initializeContentScript(): void {
  selectionTracker.attach();

  chrome.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse) => {
      if (message === SMART_LINK_COPY_MESSAGE) {
        void runSmartLinkCopy().then(() => sendResponse());
        return true;
      }
      return undefined;
    }
  );
}

initializeContentScript();
