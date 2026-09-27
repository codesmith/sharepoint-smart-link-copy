# 技術仕様書 (Architecture Design Document)

## テクノロジースタック

### 言語・ランタイム

| 技術 | バージョン |
|------|-----------|
| Node.js | v24.11.0 (開発・ビルド時のみ。拡張機能本体はブラウザ上で動作) |
| TypeScript | 5.x |
| npm | 11.x |

### フレームワーク・ライブラリ

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| Chrome Extension Manifest V3 | 仕様バージョン3 | 拡張機能の実行基盤 | 現行Chromeで新規拡張機能を公開・配布する場合の標準仕様。Manifest V2は既に廃止段階にあるため選択肢に入れない |
| `@types/chrome` | 最新版 | Chrome拡張機能APIの型定義 | `chrome.contextMenus` / `chrome.tabs` 等をTypeScriptから型安全に呼び出すため |

追加のUIフレームワーク(React等)やビルドバンドラー(webpack/vite等)は導入しない。
理由: 本拡張機能は専用の画面を持たず、Background Service WorkerとContent Scriptのみで完結するため、
既存リポジトリの`tsc`ベースのビルド(`npm run build`)で十分と判断した。

**Content Scriptのロード方式**: `manifest.json`の`content_scripts`はクラシックスクリプトとしてロードされるため、
`content/index.ts`(複数ファイルに分割され、静的`import`文を持つ)をそのまま指定すると構文エラーになる。
バンドラーを導入する代わりに、`content/loader.ts`という薄いローダーを用意し、
`chrome.runtime.getURL()`と動的`import()`で`content/index.js`をESモジュールとして読み込む
(`content_scripts[].js`には`loader.js`を指定する)。動的`import()`はクラシックスクリプト内からも呼び出し可能で、
かつロード対象はESモジュールとして扱われるため、複数ファイル構成のまま追加の依存ライブラリなしで解決できる。

**`web_accessible_resources`への登録が必須**: `content_scripts[].js`に直接指定するファイル(`loader.js`)とは異なり、
`loader.ts`が動的`import()`で読み込む`content/index.js`(およびそれが静的importする`content/*.js`・`shared/*.js`)は、
`manifest.json`の`web_accessible_resources`に明示的に登録しないと、ページ側のコンテキストからの読み込みが
拒否される(Manifest V3の仕様)。この登録を忘れると、動的importが例外を投げずにサイレントに失敗し、
Content Script側の処理(`initializeContentScript`)が一切実行されないため、コンテキストメニューは正常に表示
されるにもかかわらず、クリックしても何も起きない(クリップボードが変化しない)という分かりにくい不具合になる
(実際に発生し、修正した既知の不具合)。`matches`を対象サイトに限定することで、他サイトからのアクセスは防いでいる。

**相対importには`.js`拡張子を明記する**: バンドラーを導入していないため、`background`(`type: "module"`)・
`content`(動的`import()`経由)のスクリプトは、いずれもブラウザのネイティブESモジュールとして解決される。
ネイティブESモジュール解決は拡張子なしの相対パス(例: `from './FolderPathResolver'`)を解決できないため、
`src/`内の相対importは`from './FolderPathResolver.js'`のように**コンパイル後のJSの拡張子**を明記する
(`tsconfig.json`の`moduleResolution: "bundler"`は、ソースが`.ts`であっても`.js`指定のimportをその`.ts`ファイルへ
解決できるため、型チェック上も問題ない)。拡張子を省略すると、`tsc`はimport文をそのまま出力するため実行時に
`Service worker registration failed` 等のモジュール解決エラーになる(実際に発生し、修正した既知の不具合)。
なお`import type`は実行時のJSに出力されないため、この対応は不要。

### 開発ツール

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| Vitest | ^2.0.0 | ユニットテスト | 既存リポジトリに導入済みのテスト基盤をそのまま利用 |
| ESLint / Prettier | 既存設定を利用 | 静的解析・フォーマット | 既存リポジトリの設定を踏襲し、追加導入コストをかけない |
| jsdom | ^ | `SelectionReader`/`SelectionTracker`のDOMテスト環境 | 選択アイテム名をDOMから読み取る機能(下記「選択アイテム一覧の追加」参照)のテストに必要。各テストファイルで`// @vitest-environment jsdom`を指定して使い、それ以外のテストはNode環境のまま実行する |

`FolderPathResolver`/`BreadcrumbBuilder`はURL・文字列処理のみの純粋関数で、Node環境のままユニットテストできる。
なお、一時は「コピー対象をDOMから検知しない」設計としてjsdomを削除したが、選択アイテム一覧の追加により
DOM読み取り(`SelectionReader`)が必要になったため再導入した。

### 設計方針の変更(実機検証による)

当初は右クリックされたファイル/フォルダー行をDOM解析で特定する設計だったが、実機検証の結果、
SharePoint/OneDriveがファイル/フォルダー行の右クリックに独自のコンテキストメニューを表示し、
ブラウザ標準のコンテキストメニュー(拡張機能のメニュー項目を含む)を抑制してしまうことが判明した。
また、DOM検知に頼った場合、無関係なUI要素(ストレージ容量アップグレードのバナー等)を誤って
ファイル/フォルダー名として抽出する不具合も発生した。

これを受けて、`ContextTargetTracker`(右クリック対象DOM要素の記録)と`ItemInfoExtractor`(DOM要素からの
ファイル/フォルダー情報抽出)を廃止し、「現在アドレスバーに表示されているフォルダー」を常にコピー対象とする
設計に変更した。これによりDOM操作への依存がなくなり、SharePoint/OneDrive側のUI変更に対する耐性も
向上した(詳細は`docs/functional-design.md`の「設計方針の変更」参照)。

### 選択アイテム一覧の追加(限定的なDOM読み取りの再導入)

ファイル共有のニーズに応えるため、パンくずの下に「選択されているアイテム名」を列挙する機能を追加した。
ここでは再びDOMを読み取るが、前述の問題(右クリック対象の特定不能・無関係要素の誤抽出)を避けるため、次の方針とした。

- 読み取るのは右クリック対象ではなく**選択状態**(`aria-selected="true"`の行)に限定し、行の内側のみを走査する
- 右クリックで選択が解除されるUIに備え、右クリックの`mousedown`/`contextmenu`(captureフェーズ)で
  選択名をスナップショットする(`SelectionTracker`)
- DOM構造が想定外で取得できない場合は例外にせず「選択なし」として扱い、パンくずのみをコピーする
  (`SelectionReader`は名前の取得方法を多段のフォールバックにして耐性を持たせる)

このDOM依存は`SelectionReader`(と`SelectionTracker`)に閉じ込め、URL解析・整形ロジックには波及させない。

## アーキテクチャパターン

### Chrome拡張機能のプロセス分離アーキテクチャ

Manifest V3の制約上、レイヤーは「責務」ではなく「実行コンテキスト」で分離される。

```
┌───────────────────────────────┐
│  Background Service Worker      │ ← 拡張機能のライフサイクル管理、
│  (ContextMenuController)        │   コンテキストメニューの登録・クリック処理
├───────────────────────────────┤
│  Content Script                 │ ← SharePoint/OneDriveページのDOM/URLへの
│  (Tracker/Extractor/Resolver/   │   アクセス、パンくず構築、クリップボード書き込み
│   Builder/Writer)                │
├───────────────────────────────┤
│  対象Webページ                   │ ← SharePoint / OneDriveのDOM(読み取り専用でアクセス)
│  (SharePoint/OneDrive)          │
└───────────────────────────────┘
```

#### Background Service Worker
- **責務**: コンテキストメニュー項目の登録、クリックイベントの検知、Content Scriptへの処理実行指示
- **許可される操作**: `chrome.contextMenus` / `chrome.tabs` APIの呼び出し
- **禁止される操作**: 対象ページのDOMへの直接アクセス(必ずContent Script経由)
- **制約**: Manifest V3のService Workerはアイドル時に破棄されるため、状態を保持しない(ステートレスに設計する)

#### Content Script
- **責務**: 対象ページのDOM/URL解析、パンくずデータの構築、クリップボードへの書き込み
- **許可される操作**: 実行対象ページ(SharePoint/OneDrive)のDOM読み取り、`navigator.clipboard`の呼び出し
- **禁止される操作**: 拡張機能のライフサイクル管理(コンテキストメニュー登録はBackground側の責務)

#### 対象Webページ(SharePoint/OneDrive)
- 本拡張機能が直接変更・制御する対象ではない。読み取り専用のデータソースとして扱う

## データ永続化戦略

本拡張機能は永続化すべきデータを持たない(ステートレス)。

| データ種別 | ストレージ | フォーマット | 理由 |
|-----------|----------|-------------|------|
| なし | - | - | ユーザー設定・履歴等を保存する機能はMVPスコープに含まれないため、`chrome.storage`等の永続化APIは使用しない |

### バックアップ戦略

該当なし(永続化データを持たないため)。

## パフォーマンス要件

### レスポンスタイム

| 操作 | 目標時間 | 測定環境 |
|------|---------|---------|
| 「Smart Link Copy」クリックからクリップボード書き込み完了まで | 500ms以内 | 一般的な社内PC(Chrome最新版、フォルダー階層10階層程度) |
| コンテキストメニュー項目の表示 | 体感遅延なし(Chromeネイティブメニューの表示速度に準拠) | 同上 |

### リソース使用量

| リソース | 上限 | 理由 |
|---------|------|------|
| メモリ | 数MB程度(Background Service Worker + Content Script) | 状態を保持しない軽量な処理のみのため、明確な上限値管理は不要 |
| CPU | 瞬間的な文字列処理のみ | URL解析・文字列連結が中心で、継続的な負荷は発生しない |

## セキュリティアーキテクチャ

### データ保護

- **暗号化**: 対象なし(機密データを保存・送信しないため)
- **アクセス制御**: `host_permissions`を SharePoint(`*.sharepoint.com`)とOneDrive(`onedrive.live.com`)のみに限定し、他サイトのDOM・URLへは一切アクセスしない
- **機密情報管理**: Microsoft 365の認証情報・アクセストークン・Cookie等を取得・保存・送信する処理は実装しない(そもそも扱わない設計とする)

### 入力検証

- **バリデーション**: DOMから抽出したファイル名・フォルダー名が空文字の場合は処理を中断しエラーとする
- **サニタイゼーション**: クリップボードへ書き込むHTML文字列に、ファイル名・フォルダー名(ユーザー・SharePoint由来の可変文字列)を埋め込む際は、`<` `>` `&` `"` `'` を必ずHTMLエスケープし、XSS(貼り付け先アプリでのスクリプト実行等)を防止する
- **エラーハンドリング**: 解析・抽出・書き込みいずれかに失敗した場合はクリップボードを変更せず、処理前の状態を維持する

### Manifest V3のパーミッション設計

| パーミッション | 用途 | 最小権限の考慮 |
|---------------|------|----------------|
| `contextMenus` | 「Smart Link Copy」メニューの登録・クリック検知 | 必須最小限 |
| `scripting` | Content Scriptが存在しないタブへの読み込み(自己修復)と、失敗原因の取得 | `host_permissions`の範囲(SharePoint/OneDrive)にのみ作用する |
| `host_permissions: ["*://*.sharepoint.com/*", "*://onedrive.live.com/*"]` | 対象ページでのContent Script実行・DOM/URLアクセス | SharePoint/OneDrive以外のドメインは含めない |

`activeTab`や全URL(`<all_urls>`)のような広範なパーミッションは要求しない。
Content Scriptは通常`content_scripts`(`manifest.json`)でSharePoint/OneDriveに事前登録されており、
Backgroundからは`chrome.tabs.sendMessage`でメッセージを送る。ただし、拡張機能の更新後に開きっぱなしのタブなど
Content Scriptが存在しない場合は`sendMessage`が「Receiving end does not exist」で失敗するため、
`ContextMenuController`は`chrome.scripting.executeScript`で`content/index.js`をそのタブに読み込んでから
1度だけ再送する(自己修復)。この読み込みに失敗した場合は、失敗の原因メッセージ(`import()`の例外等)を
拡張機能のエラー画面にログ出力するため、ページ側のコンソールを見なくても原因を確認できる。
当初は「`scripting`は不要」としていたが、この自己修復と診断のために追加した。
`navigator.clipboard.write`はContent Script内でユーザー操作(コンテキストメニュー選択)を起点に呼び出すため、
`clipboardWrite`パーミッションの宣言も不要である。

## スケーラビリティ設計

### データ増加への対応

- **想定データ量**: フォルダー階層の深さは実運用上10階層程度までを想定(PRDの非機能要件に準拠)
- **パフォーマンス劣化対策**: `FolderPathResolver`の処理は階層数に対して線形時間(O(階層数))で完結するため、10階層〜数十階層でも実用上問題にならない
- **アーカイブ戦略**: 該当なし(永続化データを持たないため)

### 機能拡張性

- **プラグインシステム**: MVPでは導入しない。Post-MVP機能(ファイル単位でのリンクコピー、Outlook/Word対応等)は、`FolderPathResolver`/`ClipboardWriter`をサイト別・貼り付け先別に差し替え可能なインターフェース設計としておくことで拡張余地を残す
- **設定のカスタマイズ**: MVPでは設定画面を持たない
- **API拡張性**: 将来Microsoft Graph API連携が必要になった場合は、OAuth認証コンポーネントとAPIクライアントを新規レイヤーとして追加する想定とし、既存のContent Script側ロジック(パンくず構築)への影響を最小限にする設計とする

## テスト戦略

### ユニットテスト
- **フレームワーク**: Vitest
- **対象**: `FolderPathResolver`(URL解析・階層構築ロジック)、`BreadcrumbBuilder`(パンくず・選択アイテム一覧の合成ロジック)、
  HTMLエスケープ処理、`SelectionReader`/`SelectionTracker`(jsdom環境)
- **カバレッジ目標**: 上記のロジック部分について80%以上

### 統合テスト
- **方法**: モックURLと選択アイテム名を用意し、`FolderPathResolver`→`BreadcrumbBuilder`の連携をVitest上で検証(Node環境)
- **対象**: 現在のフォルダー階層・選択アイテムに応じたエンドツーエンドのデータ変換(ユーザー指定フォーマットとの完全一致)

### E2Eテスト
- **ツール**: 自動化ツールは導入せず、手動確認とする(実際のMicrosoft 365テナントへの依存が大きいため)
- **シナリオ**: 実際のSharePointチームサイト/OneDrive個人領域で右クリック→「Smart Link Copy」→Teams/OneNoteへの貼り付けを行い、階層・リンクの表示を確認する

## 技術的制約

### 環境要件
- **OS**: Windows / macOS(Chromeが動作するOS全般。社内PCでの利用を想定)
- **ブラウザ**: Google Chrome最新版(Manifest V3対応バージョン)
- **必要な外部依存**: なし(拡張機能単体で動作。外部サーバー・APIへの依存なし)

### パフォーマンス制約
- SharePoint/OneDriveのURL構造(`id`クエリパラメータの形式等)は将来的なUI変更(Microsoft側のアップデート)により
  変化する可能性があり、`FolderPathResolver`のURL解析ロジックはその都度メンテナンスが必要になる制約がある
- 選択アイテム名の読み取り(`SelectionReader`)はSharePoint/OneDriveのDOM構造(`aria-selected`・`role`属性等)に依存する。
  UI変更で取得できなくなった場合も、パンくずのコピー自体は継続できる設計だが、セレクターの調整が必要になる

### セキュリティ制約
- `host_permissions`をSharePoint/OneDriveドメインに限定しているため、それ以外のドメインでの動作(将来的な他ドキュメント共有サービスへの対応等)には、都度パーミッションの追加とストア審査(社内配布の場合は社内承認)が必要になる

## 依存関係管理

| ライブラリ | 用途 | バージョン管理方針 |
|-----------|------|-------------------|
| `@types/chrome` | Chrome拡張機能APIの型定義 | `^`によるマイナーバージョン追従(型定義のみのためリスクは低い) |
| `typescript` | 既存リポジトリの設定を継承 | 既存の`~5.3.0`方針を踏襲 |
| `vitest` / `@vitest/coverage-v8` | テスト | 既存リポジトリの`^2.0.0`方針を踏襲 |
| `jsdom` | DOM依存ロジックのテスト環境 | `^`によるマイナーバージョン追従 |
