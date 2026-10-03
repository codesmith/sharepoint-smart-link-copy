import type { BreadcrumbSegment } from '../shared/types';

// OneDrive/SharePointは共通のFluent UI製パンくずコンポーネントを使っており、各階層は
// `[data-automationid="breadcrumb-crumb"]` という(ハッシュ付きクラス名と違い安定した)自動化属性を持つ。
// 各要素の内側の`[title]`要素のtitle属性(表示テキストの省略時にも元の文字列を保持する)を優先し、
// 無ければテキストをそのまま使う。
//
// 注意: 階層が深くなると、パンくずUIは先頭側の階層(起点の「マイファイル」/サイト名を含む)を
// 📁アイコンのオーバーフローメニューに折りたたむ。その場合、先頭の`breadcrumb-crumb`は起点ではなく
// 途中のフォルダーになる。そのため「先頭=起点」とはみなさず、URL由来のフォルダー列と末尾から照合し、
// 照合できなかった先頭側の余りだけを起点ラベルとして扱う。
const BREADCRUMB_CRUMB_SELECTOR = '[data-automationid="breadcrumb-crumb"]';

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').replace(/[\t\n\r ]+/g, ' ').replace(/^ | $/g, '');
}

function readCrumbLabel(crumb: Element): string {
  const textElement = crumb.querySelector('[title]') ?? crumb;
  return normalizeName(
    textElement.getAttribute('title') ?? textElement.textContent
  );
}

export function readBreadcrumbLabels(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll(BREADCRUMB_CRUMB_SELECTOR))
    .map((crumb) => readCrumbLabel(crumb))
    .filter((label) => label !== '');
}

// パンくずUIの可視ラベル列(crumbLabels)と、URLから構築した階層(segments。先頭は起点)を末尾から照合する。
// - 可視ラベルの末尾側はフォルダー階層(現在のフォルダーが最後)に一致する
// - 一致しなかった先頭側の余りが、起点(マイファイル、またはサイト名等)を表す
// - 余りが無ければ起点は折りたたまれて見えていないため、nullを返す(誤ってフォルダー名を起点にしない)
export function selectRootLabel(
  crumbLabels: string[],
  segments: BreadcrumbSegment[]
): string | null {
  const folderLabels = segments.slice(1).map((segment) => segment.label);

  let matchedCount = 0;
  while (
    matchedCount < crumbLabels.length &&
    matchedCount < folderLabels.length &&
    crumbLabels[crumbLabels.length - 1 - matchedCount] ===
      folderLabels[folderLabels.length - 1 - matchedCount]
  ) {
    matchedCount++;
  }

  const leading = crumbLabels.slice(0, crumbLabels.length - matchedCount);
  if (leading.length === 0) {
    return null;
  }

  // 末尾照合がフォルダー階層全体に及ばない(DOMとURLの対応が想定外)場合、余りの先頭がフォルダー名と
  // 一致するなら、それは折りたたみ後の途中のフォルダーである可能性が高いため起点とみなさない
  const fullyMatched = matchedCount === folderLabels.length;
  if (!fullyMatched && folderLabels.includes(leading[0])) {
    return null;
  }

  return leading[0];
}

export function readBreadcrumbRootLabel(
  root: ParentNode,
  segments: BreadcrumbSegment[]
): string | null {
  return selectRootLabel(readBreadcrumbLabels(root), segments);
}
