# リポジトリ構造定義書 (Repository Structure Document)

## プロジェクト構造

```
smart-sharepoint-link/
├── manifest.json           # Chrome拡張機能マニフェスト(Manifest V3)
├── public/                 # ビルドを経ずにそのまま拡張機能に含める静的ファイル
│   └── icons/               # 拡張機能アイコン
├── src/                     # ソースコード(TypeScript)
│   ├── background/          # Background Service Worker
│   ├── content/              # Content Script
│   ├── shared/               # background/contentの両方から参照する型・定数
├── tests/                   # テストコード
│   ├── unit/                 # ユニットテスト
│   └── integration/          # 統合テスト(jsdomによるDOM/URLモック)
├── dist/                    # ビルド成果物(gitignore対象。manifest.jsonが参照する実体)
├── docs/                    # プロジェクトドキュメント
└── .steering/               # 作業単位のステアリングファイル
```

E2Eテストは実際のMicrosoft 365テナントへの依存が大きいため自動化せず、手動確認とする(`docs/architecture.md`参照)。そのため`tests/e2e/`は現時点では作成しない。

## ディレクトリ詳細

### src/ (ソースコードディレクトリ)

#### background/

**役割**: 拡張機能のライフサイクル管理、コンテキストメニューの登録・クリックハンドリング(`docs/architecture.md`のBackground Service Workerレイヤーに対応)

**配置ファイル**:
- `ContextMenuController.ts`: 「Smart Link Copy」メニューの登録、クリック時にContent Scriptへ処理実行を指示する
- `index.ts`: Service Workerのエントリーポイント(`ContextMenuController`の初期化のみを行う)

**命名規則**:
- クラスファイルはPascalCase(例: `ContextMenuController.ts`)
- エントリーポイントは`index.ts`固定

**依存関係**:
- 依存可能: `shared/`
- 依存禁止: `content/`(直接import禁止。`chrome.tabs.sendMessage`経由でのみやり取りする)

**例**:
```
background/
├── ContextMenuController.ts
└── index.ts
```

#### content/

**役割**: SharePoint/OneDriveページのURL解析、選択アイテム名・サイト名の読み取り、パンくずデータ構築、クリップボード書き込み(`docs/architecture.md`のContent Scriptレイヤーに対応)。
右クリック対象をDOMから検知する設計は廃止し(`docs/architecture.md`の「設計方針の変更」参照)、フォルダー階層は
現在表示しているページのURLのみを情報源とする。DOMの読み取りは「選択アイテム名」「SharePointサイト名」に限定し、
`SelectionReader`/`SelectionTracker`/`BreadcrumbRootLabelReader`に閉じ込める

**配置ファイル**:
- `FolderPathResolver.ts`: URLからのフォルダー階層解析・リンク構築・起点ラベルの置き換え(関数ベース)
- `BreadcrumbBuilder.ts`: フォルダー階層と選択アイテム名のHTML/プレーンテキスト変換(関数ベース)
- `SelectionReader.ts`: DOMから選択アイテム名を読み取る(関数ベース。DOM構造依存はここに集約する)
- `SelectionTracker.ts`: 右クリック直前の選択状態のスナップショット保持
- `BreadcrumbRootLabelReader.ts`: OneDrive/SharePoint共通のパンくずUIから起点ラベルを読み取る(関数ベース)
- `ClipboardWriter.ts`: クリップボードへのHTML/プレーンテキスト書き込み
- `index.ts`: Content Scriptの本体(各処理の組み立てとBackgroundからのメッセージ受信)
- `loader.ts`: `manifest.json`の`content_scripts`から実際に読み込まれるローダー。動的`import()`で
  `index.js`をESモジュールとして読み込む(`docs/architecture.md`参照)

**命名規則**:
- クラスファイルはPascalCase、責務を表す名詞(接尾辞: `Resolver` / `Builder` / `Reader` / `Tracker` / `Writer`)
- 状態を持たない純粋ロジック(`FolderPathResolver` / `BreadcrumbBuilder` / `SelectionReader` / `BreadcrumbRootLabelReader`)はクラスを使わず関数として実装する

**依存関係**:
- 依存可能: `shared/`
- 依存禁止: `background/`

**例**:
```
content/
├── FolderPathResolver.ts
├── BreadcrumbBuilder.ts
├── SelectionReader.ts
├── SelectionTracker.ts
├── BreadcrumbRootLabelReader.ts
├── ClipboardWriter.ts
├── index.ts
└── loader.ts
```

#### shared/

**役割**: `background/`と`content/`の両方、またはテストコードから参照する型定義・定数を配置する

**配置ファイル**:
- `types.ts`: `BreadcrumbSegment` / `PageContext` / `BreadcrumbResult`(`docs/functional-design.md`のデータモデル定義に対応)
- `errors.ts`: `BreadcrumbResolutionError`
- `messages.ts`: Background⇔Content Script間のメッセージ型定義

**命名規則**:
- 型定義集はkebab-case(例: `types.ts`, `messages.ts`)

**依存関係**:
- 依存可能: なし(他レイヤーに依存しない末端モジュールとする)
- 依存禁止: `background/`, `content/`(循環依存防止のため)

### tests/ (テストディレクトリ)

#### unit/

**役割**: ユニットテストの配置

**構造**:
```
tests/unit/
└── content/                    # srcディレクトリと同じ構造
    ├── FolderPathResolver.test.ts
    ├── BreadcrumbBuilder.test.ts
    ├── SelectionReader.test.ts    # jsdom環境(ファイル先頭で `// @vitest-environment jsdom` を指定)
    ├── SelectionTracker.test.ts   # 同上
    └── BreadcrumbRootLabelReader.test.ts  # 同上
```

**命名規則**:
- パターン: `[テスト対象ファイル名].test.ts`
- 例: `FolderPathResolver.ts` → `FolderPathResolver.test.ts`

#### integration/

**役割**: 統合テストの配置(モックURLと選択アイテム名を使い、複数コンポーネントの連携を検証する。DOM操作を
行わないためNode環境で実行する)

**構造**:
```
tests/integration/
└── smart-link-copy/
    ├── current-location.test.ts        # 現在のフォルダー階層・選択アイテム一覧のエンドツーエンド検証
    └── breadcrumb-root-label.test.ts    # パンくずUIからの起点ラベル取得のエンドツーエンド検証(jsdom環境)
```

### docs/ (ドキュメントディレクトリ)

**配置ドキュメント**:
- `product-requirements.md`: プロダクト要求定義書
- `functional-design.md`: 機能設計書
- `architecture.md`: アーキテクチャ設計書
- `repository-structure.md`: リポジトリ構造定義書(本ドキュメント)
- `development-guidelines.md`: 開発ガイドライン
- `glossary.md`: 用語集
- `ideas/`: 壁打ち・ブレストの成果物

### public/ (静的ファイルディレクトリ)

**配置ファイル**:
- `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`: 拡張機能アイコン(Chrome Web Store/社内配布パッケージ用)

**依存関係**: ビルド処理を経由せず、`dist/`へそのままコピーして配置する

## ファイル配置規則

### ソースファイル

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| Background用クラス | `src/background/` | PascalCase | `ContextMenuController.ts` |
| Content Script用クラス | `src/content/` | PascalCase(役割接尾辞つき) | `FolderPathResolver.ts` |
| 共通型定義 | `src/shared/` | kebab-case | `types.ts` |

### テストファイル

| テスト種別 | 配置先 | 命名規則 | 例 |
|-----------|--------|---------|-----|
| ユニットテスト | `tests/unit/` | `[対象].test.ts` | `FolderPathResolver.test.ts` |
| 統合テスト | `tests/integration/` | `[シナリオ].test.ts` | `copy-file.test.ts` |

### マニフェスト・設定ファイル

| ファイル種別 | 配置先 | 備考 |
|------------|--------|------|
| Chrome拡張機能マニフェスト | プロジェクトルート `manifest.json` | `background.service_worker`は`dist/background/index.js`、`content_scripts[].js`は`dist/content/loader.js`(`content/index.js`を動的importするローダー。`docs/architecture.md`参照)を参照する |
| 型定義(Chrome API) | `@types/chrome`(devDependencies) | `src/`配下に型定義ファイルを個別配置する必要はない |

## 命名規則

### ディレクトリ名

- レイヤーディレクトリ: 複数形は使わず、Chrome拡張機能の実行コンテキスト名をそのまま採用する
  - 例: `background/`, `content/`, `shared/`
  (`docs/architecture.md`のプロセス分離アーキテクチャの名称と一致させ、ドキュメントとコードの対応関係を分かりやすくするため)

### ファイル名

- **クラスファイル**: PascalCase
  - 例: `FolderPathResolver.ts`, `BreadcrumbBuilder.ts`
- **型定義・定数ファイル**: kebab-case
  - 例: `types.ts`, `messages.ts`
- **エントリーポイント**: `index.ts`固定

### テストファイル名

- パターン: `[テスト対象].test.ts`
- 例: `FolderPathResolver.test.ts`

## 依存関係のルール

### レイヤー間の依存

```
background/ ─┐
             ├─→ shared/
content/    ─┘
```

**禁止される依存**:
- `background/` → `content/`(❌ 直接import禁止。`chrome.tabs.sendMessage`によるメッセージング経由のみ許可)
- `content/` → `background/`(❌)
- `shared/` → `background/` または `content/`(❌ 循環依存防止)

### モジュール間の依存(content/内)

```
index.ts
  ├─→ FolderPathResolver
  ├─→ SelectionTracker ─→ SelectionReader
  ├─→ BreadcrumbRootLabelReader
  ├─→ BreadcrumbBuilder
  └─→ ClipboardWriter
```

`FolderPathResolver` / `BreadcrumbBuilder` は純粋なデータ変換ロジックとして、DOMや`navigator.clipboard`(`ClipboardWriter`)に依存しない設計とし、ユニットテストを容易にする。
DOM構造への依存は`SelectionReader`と`BreadcrumbRootLabelReader`にのみ集約し、他のモジュールへ波及させない。

## スケーリング戦略

### 機能の追加

1. **Post-MVP機能(ファイル単位でのリンクコピー、Outlook/Word対応等)**: まずは`content/`配下に新規モジュールを追加し、既存モジュールとの置き換え可能なインターフェース(`docs/architecture.md`の機能拡張性の方針)で実装する
2. **対象サイトの追加**(将来的にBox/Google Drive等へ拡大する場合): `content/`配下にサイト別のサブディレクトリ(例: `content/sharepoint/`, `content/box/`)を切る形で分離する

### ファイルサイズの管理

- 1ファイル: 300行以下を推奨。特に`FolderPathResolver`はURL解析ロジックが複雑化しやすいため、300行を超える場合はサイト種別(OneDrive/SharePoint)ごとにファイル分割を検討する

## 特殊ディレクトリ

### .steering/ (ステアリングファイル)

**役割**: 特定の開発作業における「今回何をするか」を定義

**構造**:
```
.steering/
└── [YYYYMMDD]-[task-name]/
    ├── requirements.md      # 今回の作業の要求内容
    ├── design.md            # 変更内容の設計
    └── tasklist.md          # タスクリスト
```

**命名規則**: `20250115-add-user-profile` 形式

### .claude/ (Claude Code設定)

**役割**: Claude Code設定とカスタマイズ

**構造**:
```
.claude/
├── commands/                # スラッシュコマンド
├── skills/                  # タスクモード別スキル
└── agents/                  # サブエージェント定義
```

## 除外設定

### .gitignore

プロジェクトで除外すべきファイル:
- `node_modules/`
- `dist/`(ビルド成果物。`manifest.json`が参照する実体だが、ソースからビルドされるためコミットしない)
- `.env`
- `.steering/`(タスク管理用の一時ファイル。既存の`.gitignore`方針に準拠)
- `*.log`
- `.DS_Store`

### .prettierignore, eslint.config.js の除外設定

ツールで除外すべきファイル:
- `dist/`
- `node_modules/`
- `.steering/`
- `coverage/`
