# Smart Link Copy

SharePoint/OneDriveで共有したいフォルダーを開いた状態で右クリックし、「Smart Link Copy」を選択すると、
トップフォルダーから現在のフォルダーまでの階層をパンくず形式のリッチテキストリンクとしてクリップボードに
コピーできるChrome拡張機能(Manifest V3)です。Teams/OneNoteに貼り付けると、共有相手がフォルダーの場所を
直感的に把握できます。詳細な仕様は`docs/product-requirements.md`を参照してください。

> ファイル/フォルダーの行を直接右クリックしても、SharePoint/OneDrive自身の独自メニューに
> ブラウザの標準メニューごと奪われるため、「Smart Link Copy」は表示されません。
> **共有したいフォルダーの中に入ってから**、ページ内の空白部分などで右クリックしてください。

## 使い方

1. 共有したいフォルダーを開く
2. (特定のファイルも伝えたい場合)ファイルを選択する(複数選択可)
3. ページ内の空白部分で右クリック →「Smart Link Copy」
4. Teams/OneNoteに貼り付ける

```
マイファイル > ◆自己紹介 > 20250108_トリセツ
　┗ 20231122_近況報告_DED_山田太郎.pptx
　┗ Cropped_Image.png
```

1行目は現在のフォルダーのパンくず(各フォルダーはリンク付き)、2行目以降は選択したアイテム名(リンクなし)です。
何も選択していない場合は、パンくずのみがコピーされます。

## Chrome拡張機能の読み込み方法(社内限定配布・開発時)

```bash
npm install
npm run build
```

1. Chromeで`chrome://extensions`を開く
2. 「デベロッパーモード」を有効化する
3. 「パッケージ化されていない拡張機能を読み込む」から、生成された`dist/`ディレクトリを選択する
4. SharePoint/OneDriveで共有したいフォルダーを開き、ページ内の空白部分で右クリックして「Smart Link Copy」を選択、
   Teams/OneNote等に貼り付けてパンくずリンクが入ることを確認する

ソース変更時は`npm run dev`(監視ビルド)を実行し、`chrome://extensions`のこの拡張機能のカードで
「更新」ボタンを押すと変更が反映されます。**拡張機能を更新しただけでは、既に開いているSharePoint/OneDriveの
タブには反映されません。**必ず対象タブを閉じて開き直す(または再読み込みする)必要があります。

---

# claude-code-book-chapter8

本リポジトリは技術評論社より発行されている[「実践Claude Code入門 - 現場で活用するためのAIコーディングの思考法」](https://www.amazon.co.jp/dp/4297153548)のサンプルコードを管理するGitHubリポジトリです。

リポジトリ内のコード・プロンプトに関する詳細な解説は、書籍をご覧ください。

書籍の内容に関するご質問、不備のご指摘については以下のリポジトリのイシューよりお願いいたします。

https://github.com/GenerativeAgents/claude-code-book

## 注意事項

本リポジトリの内容は読者からのフィードバックを受けて、より性能の良いプロンプトに変更されることがあります。差分は随時書籍に反映されますが、お手元の版との差分があることをご承知おきください。

## 使い方

### 1. リポジトリのクローン

```bash
git clone [このリポジトリ] claude-code-book-chapter8
cd claude-code-book-chapter8
```

### 2. Dev Container経由で開く

Visual Studio Codeで「Reopen in Container」を選択すると、自動的に次のように環境構築が行われます。

- Node.js LTS環境の構築
- npm installの実行
- Claude Codeの最新版インストール

※ Dev Containerを利用する際は、事前にDockerのインストールが必要です。
