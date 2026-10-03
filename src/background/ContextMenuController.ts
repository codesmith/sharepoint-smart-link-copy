import { SMART_LINK_COPY_MESSAGE } from '../shared/messages.js';

export const SMART_LINK_COPY_MENU_ID = 'smart-link-copy';

const TARGET_URL_PATTERNS = [
  '*://*.sharepoint.com/*',
  '*://onedrive.live.com/*',
  // Backlogは課題詳細ページ(/view/<課題キー>)でのみメニューを表示する
  '*://*.backlog.com/view/*',
  '*://*.backlog.jp/view/*',
  '*://*.backlogtool.com/view/*',
];
const CONTENT_SCRIPT_PATH = 'content/index.js';

interface LoadResult {
  ok: boolean;
  message?: string;
}

// タブ側のContent Scriptが存在しない場合(拡張機能の更新後に開きっぱなしのタブ等)に備え、
// 拡張機能側からContent Script本体をそのタブに読み込む。失敗した場合は原因のメッセージを返す
// (ページ側のコンソールを見に行かなくても、拡張機能のエラー画面で原因を確認できるようにするため)。
async function loadContentScript(tabId: number): Promise<LoadResult> {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (url: string): Promise<LoadResult> => {
        try {
          await import(url);
          return { ok: true };
        } catch (error) {
          return { ok: false, message: String(error) };
        }
      },
      args: [chrome.runtime.getURL(CONTENT_SCRIPT_PATH)],
    });
    return (
      injection?.result ?? {
        ok: false,
        message: '注入結果を取得できませんでした',
      }
    );
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

export class ContextMenuController {
  registerMenu(): void {
    // chrome.runtime.onInstalledは拡張機能の更新時にも発火するため、同一IDのメニューが
    // 既に存在しうる。事前にremoveAllしてからcreateすることで、重複登録エラーを防ぐ
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: SMART_LINK_COPY_MENU_ID,
        title: 'Smart Link Copy',
        // 右クリックした対象(ファイル/フォルダー行)は見ない設計のため、コンテキストは限定せず
        // 'all'にする。SharePoint/OneDriveはファイル/フォルダー行の右クリックに独自のメニューを
        // 表示しブラウザのネイティブメニューを抑制することが多いため、その場合はこのメニュー自体が
        // 表示されない(拡張機能側では制御できない、Microsoft側のUI仕様による制約)。
        // ページの空白部分等、ネイティブメニューが抑制されない場所であれば表示される。
        contexts: ['all'],
        documentUrlPatterns: TARGET_URL_PATTERNS,
      });
    });
  }

  handleMenuClicked(
    info: chrome.contextMenus.OnClickData,
    tab: chrome.tabs.Tab | undefined
  ): void {
    if (info.menuItemId !== SMART_LINK_COPY_MENU_ID || !tab?.id) {
      return;
    }

    void this.sendCopyRequest(tab.id);
  }

  // Content Script側が未起動の場合、sendMessageは例外を投げずrejectする。
  // その場合はContent Scriptを読み込んでから1度だけ再送し、それでも失敗したら原因をコンソールへ出力する。
  private async sendCopyRequest(tabId: number): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, SMART_LINK_COPY_MESSAGE);
      return;
    } catch (firstError) {
      const loaded = await loadContentScript(tabId);
      if (!loaded.ok) {
        console.error(
          '[Smart Link Copy] Content Scriptの読み込みに失敗しました',
          loaded.message,
          firstError
        );
        return;
      }
    }

    try {
      await chrome.tabs.sendMessage(tabId, SMART_LINK_COPY_MESSAGE);
    } catch (error) {
      console.error(
        '[Smart Link Copy] Content Scriptへの送信に失敗しました',
        error
      );
    }
  }
}
