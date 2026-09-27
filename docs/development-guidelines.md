# 開発ガイドライン (Development Guidelines)

## コーディング規約

### 命名規則

#### 変数・関数

```typescript
// ✅ 良い例
const breadcrumbSegments = buildAncestorFolders(context);
function resolvePageContext(url: string): PageContext | null { }

// ❌ 悪い例
const data = build(context);
function resolve(u: string): any { }
```

**原則**:
- 変数: camelCase、名詞または名詞句
- 関数: camelCase、動詞で始める
- 定数: UPPER_SNAKE_CASE
- Boolean: `is`, `has`, `should`で始める

#### クラス・インターフェース

```typescript
// クラス: PascalCase、責務を表す名詞(接尾辞: Writer/Controller)。DOM/Chrome APIに依存しない
// 純粋ロジック(Resolver/Builder等)はクラスを使わず関数として実装する
class ClipboardWriter { }
class ContextMenuController { }
function resolvePageContext(url: string): PageContext | null { }

// インターフェース・型エイリアス: PascalCase、I接頭辞は付けない
interface BreadcrumbSegment { }
type SiteType = 'onedrive-personal' | 'sharepoint-site';
```

`docs/repository-structure.md`で定義した`background/` `content/` `shared/`の各ディレクトリ配置ルールと命名規則を合わせて守ること。

### コードフォーマット

- **インデント**: 2スペース(`.prettierrc`の既存設定に従う)
- **フォーマッター**: Prettier(`npm run format`)。手動でのフォーマット調整は行わない
- **Lint**: ESLint(`eslint.config.js`)。`@typescript-eslint/no-explicit-any`は`warn`のため、DOM操作等でやむを得ず`any`を使う場合も理由をコメントで残す

### モジュールimport

- `src/`内で他ファイルを相対importする際は、`.js`拡張子を明記する(例: `import { Foo } from './Foo.js';`)
  **バンドラーを導入しておらず、`background`/`content`ともにブラウザのネイティブESモジュールとして
  実行されるため**、拡張子を省略するとコンパイル後のJSでモジュール解決に失敗し、
  `Service worker registration failed` 等のエラーになる(`docs/architecture.md`参照)
- `import type`(型のみimport)は実行時に出力されないため、この対応は不要

### コメント規約

```typescript
// ✅ 良い例: なぜそうするかを説明
// SharePointの短縮リンク(1drv.ms等)には階層情報が含まれないため、
// アドレスバーURLの id パラメータを情報源として使う
const context = resolvePageContext(window.location.href);

// ❌ 悪い例: 何をしているか(コードを見れば分かる)
// URLを解析する
const context = resolvePageContext(window.location.href);
```

- 関数・クラスへの多段落のドキュメントコメントは書かない。型シグネチャと命名で意図が伝わるようにする
- **`URLSearchParams.set()`に渡す値を事前に`encodeURIComponent()`しない**。`set()`は値を自身でパーセントエンコードするため、
  重ねてエンコードすると二重エンコード(`%2F` → `%252F`)になり、生成したURLが壊れる(実際に発生し修正した不具合。
  `src/content/FolderPathResolver.ts`の`buildLinkForPath`参照)
- DOM構造への依存など、SharePoint/OneDrive側の仕様変更に弱い箇所には、前提としているDOM/URL構造を1行コメントで残す(`docs/functional-design.md`のアルゴリズム説明を参照できるようにする)

### エラーハンドリング

**原則**(`docs/functional-design.md`のエラーハンドリング分類に対応):
- URL解析失敗・クリップボード書き込み失敗は、いずれも例外を上位に伝播させず、Content Script側で捕捉してエラー通知(トースト表示)に変換する
- クリップボードの内容は、処理が完全に成功した場合のみ書き換える(失敗時に中途半端な内容を書き込まない)

```typescript
class BreadcrumbResolutionError extends Error {
  constructor(
    message: string,
    public readonly cause: 'url-parse-failed' | 'clipboard-write-failed'
  ) {
    super(message);
    this.name = 'BreadcrumbResolutionError';
  }
}

try {
  const context = resolvePageContext(window.location.href);
  const segments = buildAncestorFolders(context);
  const result = buildBreadcrumbResult(segments);
  await clipboardWriter.write(result);
} catch (error) {
  if (error instanceof BreadcrumbResolutionError) {
    showErrorToast('Smart Link Copyに失敗しました。もう一度お試しください');
    return;
  }
  throw error; // 想定外のエラーは伝播させる
}
```

### セキュリティ

- クリップボードへ書き込むHTML文字列にファイル名・フォルダー名を埋め込む際は、必ずHTMLエスケープ処理(`<` `>` `&` `"` `'`)を通す(`docs/architecture.md`のセキュリティアーキテクチャ参照)
- Microsoft 365の認証情報・アクセストークン・Cookieを取得・保存・送信するコードは追加しない
- `manifest.json`の`host_permissions`は`*.sharepoint.com`と`onedrive.live.com`以外に広げない

## Git運用ルール

### ブランチ戦略

社内限定配布・小規模チーム開発のため、`develop`ブランチは設けずシンプルな構成とする。

**ブランチ種別**:
- `main`: 常に配布可能な状態を保つ
- `feature/[機能名]`: 新機能開発(例: `feature/smart-link-copy`)
- `fix/[修正内容]`: バグ修正

**フロー**:
```
main
 ├─ feature/smart-link-copy
 └─ fix/breadcrumb-url-encoding
```

### コミットメッセージ規約

**フォーマット**: Conventional Commits

```
<type>(<scope>): <subject>

<body>
```

**Type**: `feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`

**例**:
```
feat(content): FolderPathResolverでOneDriveのURL階層を解析する

onedrive.live.com の id クエリパラメータをデコードし、
起点(マイファイル)からのフォルダー階層とリンクURLを構築する処理を追加。
```

### プルリクエストプロセス

**作成前のチェック**:
- [ ] `npm run test` が全てパス
- [ ] `npm run lint` でエラーがない
- [ ] `npm run typecheck` がパス
- [ ] `npm run format` でフォーマット済み(pre-commitフックの`lint-staged`でも自動適用される)

**レビュープロセス**:
1. セルフレビュー
2. 自動テスト実行(Vitest)
3. レビュアーアサイン
4. レビューフィードバック対応
5. 承認後`main`へマージ

## テスト戦略

`docs/architecture.md`のテスト戦略に対応する形で、以下の3種類を実装する。

### ユニットテスト

**対象**: `FolderPathResolver` / `BreadcrumbBuilder` などDOM/`chrome.*` APIに依存しない純粋なロジック

**カバレッジ目標**: 80%以上

```typescript
describe('FolderPathResolver', () => {
  describe('resolvePageContext', () => {
    it('OneDriveのURLからPageContextを解決できる', () => {
      const url =
        'https://onedrive.live.com/my?id=%2Fpersonal%2Fabc123%2FDocuments%2F%E2%96%A0%E5%8B%89%E5%BC%B7%E4%BC%9A%E8%B3%87%E6%96%99&viewid=xyz';

      const context = resolvePageContext(url);

      expect(context?.siteType).toBe('onedrive-personal');
      expect(context?.idParam).toBe('/personal/abc123/Documents/■勉強会資料');
    });

    it('idパラメータが存在しない場合はnullを返す', () => {
      expect(resolvePageContext('https://onedrive.live.com/my')).toBeNull();
    });
  });
});
```

### 統合テスト

**対象**: `FolderPathResolver` → `BreadcrumbBuilder` の連携(モックURLと選択アイテム名のみで検証できる。Node環境)

```typescript
describe('Smart Link Copy(現在地のパンくずコピー)', () => {
  it('現在表示しているフォルダーまでのBreadcrumbResultを生成できる', () => {
    const context = resolvePageContext(sampleOneDriveUrl);
    const segments = buildAncestorFolders(context!);

    const result = buildBreadcrumbResult(segments);

    expect(result.text).toBe('マイファイル > ■勉強会資料 > _old');
    expect(result.html).toContain('<a href=');
    expect(result.html).not.toContain('<a href="undefined"');
  });
});
```

### E2Eテスト

自動化せず、手動確認とする(`docs/architecture.md`参照)。実際のSharePoint/OneDrive環境で右クリック→「Smart Link Copy」→Teams/OneNoteへの貼り付けを行い、階層・リンクを目視確認する。

### テスト命名規則

**パターン**: `[対象]_[条件]_[期待結果]` またはBDD形式(`describe`/`it`の日本語文章)のどちらでも良いが、プロジェクト内で混在させない(既存の`src/example.test.ts`はBDD形式のため、これに合わせる)

### モック・スタブの使用

- `chrome.contextMenus` / `chrome.tabs` などのChrome拡張機能APIはユニットテストでモック化する(`@types/chrome`の型に沿ったモックオブジェクトを用意する)
- `FolderPathResolver` / `BreadcrumbBuilder` などの純粋ロジックはURL文字列・文字列配列のみを扱い、DOM操作を行わないため、モックを使わず実装をそのままテストする(`window.location`はテスト対象関数の引数として文字列を渡すだけで済むため、DOM環境は不要)
- DOMを読み取る`SelectionReader` / `SelectionTracker`のテストは、ファイル先頭に`// @vitest-environment jsdom`を指定して`jsdom`環境で実行する(他のテストはNode環境のまま)。テストでは実際のSharePoint/OneDriveに近いHTML断片を`document.body.innerHTML`に流し込んで検証する

## コードレビュー基準

### レビューポイント

**機能性**:
- [ ] `docs/product-requirements.md`の受け入れ条件を満たしているか
- [ ] フォルダー階層が深い/浅いケース、日本語・記号を含むフォルダー名などのエッジケースが考慮されているか
- [ ] エラー時にクリップボードを書き換えない実装になっているか

**可読性**:
- [ ] 命名が明確か
- [ ] SharePoint/OneDriveのDOM・URL仕様に依存する箇所に前提のコメントがあるか

**保守性**:
- [ ] `background/` `content/` `shared/` 間の依存方向が守られているか(`docs/repository-structure.md`参照)
- [ ] `FolderPathResolver` / `BreadcrumbBuilder` がDOM/クリップボードAPIに依存せず単体テスト可能なままか

**セキュリティ**:
- [ ] HTML文字列組み立て時にエスケープ処理が入っているか
- [ ] `manifest.json`の権限が必要最小限のままか

### レビューコメントの書き方

**優先度の明示**:
- `[必須]`: 修正必須
- `[推奨]`: 修正推奨
- `[提案]`: 検討してほしい
- `[質問]`: 理解のための質問

## 開発環境セットアップ

### 必要なツール

| ツール | バージョン | インストール方法 |
|--------|-----------|-----------------|
| Node.js | v24.11.0 | devcontainer利用時は自動構築済み |
| npm | 11.x | Node.jsに同梱 |
| Google Chrome | 最新版 | 手動インストール(拡張機能の動作確認用) |

### セットアップ手順

```bash
# 1. リポジトリのクローン
git clone [このリポジトリ]
cd smart-sharepoint-link

# 2. 依存関係のインストール
npm install

# 3. ビルド
npm run build

# 4. Chromeへの読み込み(社内限定配布・開発時)
# chrome://extensions を開き、「デベロッパーモード」を有効化した上で
# 「パッケージ化されていない拡張機能を読み込む」から dist/ ディレクトリを選択する
```

### 開発時の動作確認ループ

```bash
# ソース変更を監視して自動ビルド
npm run dev

# ビルド後、chrome://extensions のこの拡張機能のカードで「更新」ボタンを押すと
# 変更が反映される(Content Scriptの変更は対象タブのリロードも必要)
```

### 推奨開発ツール

- Chrome DevTools: Content Script/Background Service Workerそれぞれのコンソールログ確認に使用する(`chrome://extensions`の「Service Worker」リンク、および対象ページ上のDevToolsから確認できる)
