// manifest.jsonのcontent_scriptsはクラシックスクリプトとしてロードされ、静的import文を含む
// ファイルを直接指定するとシンタックスエラーになる。動的import()はクラシックスクリプト内でも
// 呼び出し可能で、かつロード対象はESモジュールとして扱われるため、バンドラーを導入せずに
// 複数ファイル構成のContent Scriptを読み込むためのローダーとしてこのファイルを経由させる。
// 読み込み対象は manifest.json の web_accessible_resources に登録されている必要がある
// (未登録の場合、失敗が例外を投げずサイレントに握りつぶされるため、明示的にログへ出力する)。
import(chrome.runtime.getURL('content/index.js')).catch((error: unknown) => {
  console.error(
    '[Smart Link Copy] Content Scriptの読み込みに失敗しました',
    error
  );
});
