# Chrome Web Storeでの公開手順(調査メモ)

## このドキュメントの位置づけ

Smart Link Copy(`smart-link-copy`)をChrome Web Store(以下CWS)で公開するための手順と注意点の調査メモ。
各項目には根拠となる公式ドキュメント(Chrome for Developers / Google ヘルプ)のURLを示す。

- 調査日: 2026-10-03
- 括弧内の「最終更新」は、調査時点で各公式ページに表示されていた更新日
- 公式ページは予告なく変わるため、**作業する前に必ずリンク先の最新情報を確認すること**
- 公式ページで確認できなかった事項は「⚠️未確認」と明記している

> **前提の確認**: 現在の `docs/product-requirements.md` では「Chrome Web Storeでの一般公開」をスコープ外
> (社内限定配布のみ)としている。一般公開に方針を変える場合はPRDの更新も必要。社内配布が目的なら、
> 下記「4. 公開範囲(Visibility)の選び方」の「限定公開」「非公開」も検討すること。

---

## 1. 全体の流れ

1. デベロッパーアカウントを登録する(初回のみ)
2. 公開用のZIPを作る
3. デベロッパーダッシュボードにアップロードする
4. 「ストアの掲載情報」「プライバシーへの取り組み」「配布」の各タブを入力する
5. 審査に提出する
6. 審査を通過したら公開する(自動公開、または手動公開)

根拠: [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)

---

## 2. デベロッパーアカウントの登録(初回のみ)

| 項目 | 内容 | 根拠 |
|------|------|------|
| 登録手順 | デベロッパーダッシュボードにアクセスし、デベロッパー契約とポリシーに同意して登録料を支払う | [Register your developer account](https://developer.chrome.com/docs/webstore/register)(最終更新 2024-02-13) |
| 登録料 | **1回限り**の登録料がかかる(公式ページの文言は "a one-time registration fee") | 同上 |
| 登録料の金額 | ⚠️未確認。一般に5米ドルとされるが、調査した公式ページには金額の記載がなかった。登録画面の表示で確認すること | — |
| メールアドレス | **アカウント作成後はメールアドレスを変更できない**。重要な通知が届くため、普段確認するアドレスを使う | [Register your developer account](https://developer.chrome.com/docs/webstore/register) |
| 連絡先メールの確認 | 新しいデベロッパーアカウントでは、連絡先メールアドレスの確認が必須 | [Set up your developer account](https://developer.chrome.com/docs/webstore/set-up-account)(最終更新 2023-10-16) |
| 公開者名 | 各拡張機能のタイトルの下に表示される | 同上 |
| 2段階認証 | Googleアカウントで**2段階認証を有効にしないと、新規公開も更新もできない** | [Chrome extensions: clarifying our extension policies(2SV)](https://developer.chrome.com/en/blog/policy-update-2sv)(2021-06-29) |
| トレーダー宣言 | EUのデジタルサービス法(DSA)に基づき、**全デベロッパーが「トレーダー」か「非トレーダー」かを自己申告する必要がある**。トレーダーの場合は法的名称や連絡先などの確認が行われる | [Trader/Non-Trader developer identification and verification](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure)、[Trader FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq) |
| 新規公開者の上限 | 新しい公開者が公開できる拡張機能は**最大2つまで** | [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish) |

---

## 3. 公開用ZIPの準備

### 3.1 ZIPの構成

- `manifest.json` は**フォルダの中ではなく、ZIPのルートに置く**こと
  - 根拠: [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)(最終更新 2023-10-16)
- `manifest.json` にコメントがあるとアップロードエラーになる
  - 根拠: 同上
- パッケージの最大サイズは2GB
  - 根拠: [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)

本プロジェクトでは `npm run build` の出力先 `dist/`(直下に `manifest.json` がある)の**中身**をZIPにする。

```bash
npm run build
cd dist && zip -r ../smart-link-copy-<version>.zip . && cd ..
```

`dist/` フォルダごとZIPにすると、`manifest.json` がルートに来ないので注意。

### 3.2 manifest.jsonのチェック項目

| 項目 | 要件 | 本プロジェクトの現状 | 根拠 |
|------|------|---------------------|------|
| `name` | CWSとChromeに表示される名前 | `Smart Link Copy` | [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare) |
| `description` | **132文字以内** | 74文字(OK) | 同上 |
| `version` | **アップロードのたびに前回より大きい番号にする** | `0.1.0` | 同上、[Update your Chrome Web Store item](https://developer.chrome.com/docs/webstore/update) |
| `icons` | 拡張機能のアイコンを指定する | 16/48/128pxあり | [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare) |

### 3.3 Manifest V3のリモートコード禁止

- MV3では、リモートにホストされたコードを読み込んで実行することはできない。拡張機能の全機能が、提出したコードから読み取れる必要がある
  - 根拠: [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)(「Additional Requirements for Manifest V3」、最終更新 2025-05-22)、[Privacy practices tab](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- 本プロジェクトの `loader.ts` は動的 `import()` を使うが、読み込むのは**拡張機能に同梱した** `content/index.js`(`chrome.runtime.getURL`)だけなので、リモートコードには当たらない
  - 審査で質問された場合に備えて、説明できるようにしておく
- コードの難読化は禁止。minifyは許可されているが、なるべく書いたままのコードを提出するよう推奨されている
  - 根拠: [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process)(最終更新 2021-12-10)
  - 本プロジェクトは `tsc` の出力をそのまま使うので問題ない

---

## 4. ダッシュボードでの入力

### 4.1 パッケージのアップロード

デベロッパーダッシュボードで「新しいアイテムを追加」を押し、ZIPを選んでアップロードする。アップロード時にmanifestとZIPの構成がチェックされる。

- 根拠: [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)

### 4.2 「ストアの掲載情報」タブ

| 項目 | 必須 | 要件 | 根拠 |
|------|------|------|------|
| 説明(詳細) | 必須 | 最初に何をする拡張機能かを簡潔に書く。キーワードの詰め込み(keyword spam)は違反になる | [Store listing tab](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)(最終更新 2020-12-07) |
| カテゴリ・言語 | 必須 | — | 同上 |
| ストアアイコン | 必須 | **128×128px PNG**。絵柄は96×96pxにし、周囲16pxは透明の余白にする | [Supplying images](https://developer.chrome.com/docs/webstore/images)(最終更新 2018-06-11) |
| スクリーンショット | 必須(1枚以上) | **1280×800px または 640×400px**、最大5枚。1280×800が推奨 | 同上 |
| プロモーション用タイル(小) | 必須 | **440×280px** | 同上 |
| マーキー画像 | 任意 | 1400×560px | 同上 |
| ホームページURL・サポートURL | 任意 | — | [Store listing tab](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) |

**本プロジェクトで準備が必要なもの**

- ~~ストア用の透過アイコンが必要~~ → **作成済み**: `store/store-icon-128.png`(128×128px、絵柄96px+透明余白16px)。
  `public/icons/`のアイコンも同じデザインに差し替えた(原本は`store/*.svg`)
- ~~440×280pxのタイルが必要~~ → **作成済み**: `store/promo-tile-440x280.png`
- スクリーンショット: OneDrive版を1枚作成済み(`store/screenshot-1-1280x800.png`。原本は`screenshot-1.svg`と`screenshot-1-source.png`)。
  Backlog版は任意(最低1枚で要件を満たす)
  - **スクリーンショットに社内のフォルダー名・氏名・課題名などを写さないこと**(公開されるため)
- 掲載情報は正確・最新・網羅的である必要があり、誤解を招く内容や不完全な内容は違反になる
  - 根拠: [Program Policies(Listing Requirements)](https://developer.chrome.com/docs/webstore/program-policies/policies)

### 4.3 「プライバシーへの取り組み」タブ

根拠: [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)(最終更新 2020-06-12)

| 項目 | 内容 | 本プロジェクトでの記入方針(案) |
|------|------|----------------------------|
| 単一用途(Single purpose) | 拡張機能は、狭く分かりやすい単一の用途を持つ必要がある | 「表示中のSharePoint/OneDriveフォルダー、またはBacklog課題を、場所や文脈が分かる形式のリンクとしてクリップボードにコピーする」 |
| 権限の正当性 | manifestにある各権限について理由を書く。必要以上に広い権限は却下の原因になる | `contextMenus`: 右クリックメニューの追加<br>`scripting`: Content Scriptがないタブへの読み込み(自己修復)<br>ホスト権限: 対象サービスのページのURL/DOMを読むため(対象ドメインに限定) |
| リモートコード | リモートコードを実行するかを申告する | 「使用しない」(3.3参照) |
| データの使用 | 収集するデータの種類を申告し、ポリシーへの準拠を証明する。申告内容はユーザーに表示される | ページのURL・DOMはローカルで読むだけで、外部に送信・保存しない。⚠️ダッシュボードの選択肢(「ウェブサイトのコンテンツ」等)に該当するかは、入力画面の説明を見て判断すること |
| プライバシーポリシー | ポリシーのURLを入力する欄がある。ユーザーデータを扱う場合は、正確で最新のプライバシーポリシーの掲載が必須 | 「データを収集・送信しない」旨のポリシーをGitHub Pages等に置き、URLを記入するのが安全 |

関連ポリシー:

- 権限は機能の実装に必要な**最小限**にすること
  - 根拠: [Program Policies(Use of Permissions)](https://developer.chrome.com/docs/webstore/program-policies/policies)
- ユーザーデータは、公開している単一用途に必要な範囲でのみ収集・使用・送信できる(Limited Use)
  - 根拠: [Program Policies(Limited Use)](https://developer.chrome.com/docs/webstore/program-policies/policies)
- 2026-07-01に発表されたポリシー更新(**2026-08-01から適用**)で、Limited Use(データ収集は単一用途に「厳密に必要」なものに限る)と開示要件が強化された
  - 根拠: [Chrome Web Store policy updates(2026)](https://developer.chrome.com/blog/cws-policy-updates-2026)
  - 本拡張機能はデータを収集・送信しないが、申告内容と実装を一致させておくこと

### 4.4 「配布」タブ:公開範囲(Visibility)の選び方

根拠: [Distribution tab](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)(最終更新 2020-12-07)

| 公開範囲 | 内容 | 向いているケース |
|---------|------|----------------|
| 公開(Public) | CWSに掲載され、誰でも検索・インストールできる | 一般公開する場合 |
| 限定公開(Unlisted) | 検索や一覧には出ず、URLを知っている人だけがインストールできる | 社内などでURLを共有して配る場合 |
| 非公開(Private) | 指定したユーザー(テスターのGoogleアカウント、Googleグループ)だけがインストールできる | 公開前のテスト |
| ドメイン公開 | Google Workspaceを使う組織で、管理者が有効にすれば、組織内だけに公開できる | 社内配布(Workspace利用時) |

- 配布する国・地域も選べる(全世界、または特定の国)
  - 根拠: 同上
- Google Workspace組織での非公開公開と、管理コンソールからの自動インストール
  - 根拠: [Create and publish custom Chrome apps & extensions(Google ヘルプ)](https://support.google.com/chrome/a/answer/2714278?hl=en)
- ドメイン公開は、通常の審査より早く通ることが多い
  - 根拠: [Enterprise publishing options](https://developer.chrome.com/docs/webstore/cws-enterprise)(最終更新 2021-07-29)
- CWSを通さず、ポリシー(`ExtensionInstallForcelist`)で強制インストールする方法や、`update_url` で自前ホスティングする方法もある
  - 根拠: 同上
  - これらは組織の管理者による設定が前提

### 4.5 「テスト手順」タブ(任意)

審査担当者向けに、テスト用の認証情報や手順を書ける。

- 根拠: [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
- 本拡張機能はSharePoint/OneDrive/Backlogにログインしないと動作を確認できないため、確認手順(どのページで右クリックし、何がコピーされるか)とスクリーンショットを書いておくとよい

---

## 5. 審査

根拠: [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process)(最終更新 2021-12-10)

- 多くの場合は**数日**で終わるが、**数週間**かかることもある。3週間を超えたらデベロッパーサポートに問い合わせる
- 次の条件があると、より詳しく審査される
  - 広いホスト権限(`*://*/*`、`<all_urls>` など)
  - 強い権限(`tabs`、`downloads`、`cookies`、`webRequest` など)
  - 新しいデベロッパー、新しい拡張機能、大きなコード変更
- 本拡張機能のホスト権限は、SharePoint/OneDrive/Backlogのドメインに限定している。`<all_urls>` は使っていない
  - ただし新規デベロッパー・新規拡張機能なので、初回は時間がかかる可能性がある
- 却下されると、違反したポリシーがメールで通知される。ダッシュボードのアイテム詳細から「Appeal(再審査請求)」ができる

### 公開のタイミング

- 審査提出時に、審査通過後すぐ自動で公開するか、後で手動公開するか(遅延公開)を選べる
- 遅延公開の場合、審査完了から**30日以内**に公開する必要がある
- 根拠: [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)

---

## 6. 公開後の更新

根拠: [Update your Chrome Web Store item](https://developer.chrome.com/docs/webstore/update)(最終更新 2020-12-03)

1. `manifest.json`(と `package.json`)の `version` を**前回より大きく**する
2. `npm run build` でZIPを作り直し、ダッシュボードの「パッケージ」タブからアップロードする
3. 必要に応じて掲載情報・プライバシー・配布の各タブを更新する
4. 審査に提出する。**審査中も、公開中のバージョンには影響しない**
5. 不具合が見つかった場合は、ロールバック機能で以前のバージョンにすぐ戻せる

---

## 7. 本プロジェクト固有の注意点

| # | 注意点 | 根拠 |
|---|--------|------|
| 1 | **商標・なりすまし**: 他社が認可・推奨・製作したかのように見せてはならない。名前・説明・アイコンでMicrosoft(SharePoint/OneDrive)やBacklog(ヌーラボ)の公式ツールだと誤解されないようにする。例: 「SharePoint/OneDrive・Backlogに対応した非公式ツールです」と明記し、各社のロゴは使わない | [Program Policies(Impersonation and Intellectual Property)](https://developer.chrome.com/docs/webstore/program-policies/policies) |
| 2 | **単一用途**: SharePoint/OneDriveとBacklogの2サービスに対応しているが、用途は「表示中のページを文脈付きリンクとしてコピーする」1つにまとまる、と説明する | [Privacy practices tab](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)、[Program Policies(Quality Guidelines)](https://developer.chrome.com/docs/webstore/program-policies/policies) |
| 3 | **ホスト権限の説明**: Backlogは課題ページ以外でもContent Scriptを読み込む設定(画面遷移後もコピーできるようにするため)なので、権限の正当性欄にその理由を書く | [Privacy practices tab](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) |
| 4 | **掲載用の素材に機密情報を入れない**: スクリーンショットや説明文の例に、社内のフォルダー名・氏名・課題名・テナント名などを使わない | — |
| 5 | **社内配布だけなら一般公開は不要**: 「限定公開」「ドメイン公開」、またはCWSを通さない配布(管理者のポリシー設定)も選べる。PRDの方針(社内限定配布)に合わせて選ぶ | [Distribution tab](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)、[Enterprise publishing options](https://developer.chrome.com/docs/webstore/cws-enterprise) |

---

## 8. 公開前チェックリスト

- [ ] Googleアカウントの2段階認証を有効にした
- [ ] デベロッパー登録(登録料の支払い、連絡先メールの確認、トレーダー/非トレーダーの申告)を済ませた
- [ ] `manifest.json` の `version` を更新し、`description` が132文字以内である
- [ ] `npm test` / `npm run lint` / `npm run build` が通る
- [ ] `dist/` の**中身**をZIPにした(`manifest.json` がZIPのルートにある)
- [x] ストア用アイコン(128×128px、透過余白つき)とプロモーション用タイル(440×280px)を用意した(`store/`)
- [x] スクリーンショット(1280×800px)を用意した(`store/screenshot-1-1280x800.png`)
- [ ] スクリーンショット・説明文に機密情報や個人情報が写っていない
- [ ] 単一用途・権限の正当性・リモートコード「なし」・データ使用の申告を入力した
- [ ] プライバシーポリシーのURLを用意した
- [ ] 公開範囲(公開/限定公開/非公開/ドメイン公開)と配布地域を決めた
- [ ] 他社の公式ツールと誤解される表現・ロゴを使っていない

---

## 参考リンク一覧(公式)

- [Chrome Web Store ドキュメント トップ](https://developer.chrome.com/docs/webstore)
- [Register your developer account](https://developer.chrome.com/docs/webstore/register)
- [Set up your developer account](https://developer.chrome.com/docs/webstore/set-up-account)
- [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
- [Store listing tab](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Supplying images](https://developer.chrome.com/docs/webstore/images)
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Distribution tab](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process)
- [Update your Chrome Web Store item](https://developer.chrome.com/docs/webstore/update)
- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Trader/Non-Trader developer identification and verification](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure)
- [Enterprise publishing options](https://developer.chrome.com/docs/webstore/cws-enterprise)
- [Create and publish custom Chrome apps & extensions(Google ヘルプ)](https://support.google.com/chrome/a/answer/2714278?hl=en)
- [Chrome extensions: clarifying our extension policies(2段階認証の必須化)](https://developer.chrome.com/en/blog/policy-update-2sv)
- [Chrome Web Store policy updates(2026)](https://developer.chrome.com/blog/cws-policy-updates-2026)
