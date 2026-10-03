// OneDrive/SharePointは共通のFluent UI製パンくずコンポーネントを使っており、各階層は
// `[data-automationid="breadcrumb-crumb"]` という(ハッシュ付きクラス名と違い安定した)自動化属性を持つ。
// その先頭(文書順で最初)の要素が、現在のページの最上位(OneDriveなら「マイファイル」、SharePointなら
// サイト名に相当)を表す。内側の`[title]`要素のtitle属性(表示テキストの省略時にも元の文字列を保持する)
// を優先し、無ければテキストをそのまま使う。見つからない場合は例外を投げずnullを返す。
const BREADCRUMB_CRUMB_SELECTOR = '[data-automationid="breadcrumb-crumb"]';

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').replace(/[\t\n\r ]+/g, ' ').replace(/^ | $/g, '');
}

export function readBreadcrumbRootLabel(root: ParentNode): string | null {
  const firstCrumb = root.querySelector(BREADCRUMB_CRUMB_SELECTOR);
  if (!firstCrumb) {
    return null;
  }

  const textElement = firstCrumb.querySelector('[title]') ?? firstCrumb;
  const label = normalizeName(
    textElement.getAttribute('title') ?? textElement.textContent
  );

  return label || null;
}
