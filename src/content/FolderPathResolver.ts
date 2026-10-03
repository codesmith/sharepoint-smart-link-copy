import type { BreadcrumbSegment, PageContext, SiteType } from '../shared/types';

const ONEDRIVE_PERSONAL_HOST = 'onedrive.live.com';
const SHAREPOINT_HOST_SUFFIX = '.sharepoint.com';

function detectSiteType(hostname: string): SiteType | null {
  if (hostname === ONEDRIVE_PERSONAL_HOST) {
    return 'onedrive-personal';
  }
  if (hostname.endsWith(SHAREPOINT_HOST_SUFFIX)) {
    return 'sharepoint-site';
  }
  return null;
}

export function resolvePageContext(url: string): PageContext | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const idParam = parsed.searchParams.get('id');
  if (!idParam) {
    return null;
  }

  const siteType = detectSiteType(parsed.hostname);
  if (!siteType) {
    return null;
  }

  return {
    siteType,
    origin: parsed.origin,
    pathname: parsed.pathname,
    idParam: decodeURIComponent(idParam),
    viewId: parsed.searchParams.get('viewid') ?? undefined,
  };
}

/**
 * SharePointチームサイトのURLは通常 `/sites/<サイト名>/<ライブラリ名>/Forms/AllItems.aspx` という
 * pathnameを持つ。idパラメータのパスも同じ `sites/<サイト名>` プレフィックスを共有するため、
 * pathname上でライブラリ名(Formsの直前のセグメント)を特定し、そこまでのセグメント数を
 * idパラメータ側でも「サイトパス」としてスキップする。
 * Formsセグメントが見つからない等、想定外のURL構造の場合は、idパラメータの先頭セグメントを
 * そのままライブラリ名(起点)とみなすフォールバックとする。
 */
function resolveSharePointRootIndex(
  context: PageContext,
  idSegments: string[]
): number {
  const pathSegments = context.pathname.split('/').filter(Boolean);
  const formsIndex = pathSegments.findIndex(
    (segment) => segment.toLowerCase() === 'forms'
  );

  if (formsIndex > 0) {
    const sitePathSegments = pathSegments.slice(0, formsIndex - 1);
    const idHasSamePrefix = sitePathSegments.every(
      (segment, index) => idSegments[index] === segment
    );
    if (idHasSamePrefix) {
      return sitePathSegments.length;
    }
  }

  return 0;
}

function buildLinkForPath(
  context: PageContext,
  absolutePathSegments: string[]
): string {
  const link = new URL(context.origin + context.pathname);
  // URLSearchParams.set() は値を渡す際に自身でパーセントエンコードを行うため、
  // ここで encodeURIComponent() を重ねて呼ぶと二重エンコード(例: %2F → %252F)になってしまう。
  // そのため、デコード済みの生のパス文字列をそのまま渡す。
  link.searchParams.set('id', '/' + absolutePathSegments.join('/'));
  if (context.viewId) {
    link.searchParams.set('viewid', context.viewId);
  }
  return link.toString();
}

export function buildAncestorFolders(
  context: PageContext
): BreadcrumbSegment[] {
  const segments = context.idParam.split('/').filter(Boolean);

  // OneDrive個人領域: personal/<userId>/Documents はパンくずに表示せず「マイファイル」を起点にする
  // SharePointチームサイト: サイトパス(sites/<サイト名>等)をスキップし、ライブラリ名を起点にする
  const rootIndex =
    context.siteType === 'onedrive-personal'
      ? 2
      : resolveSharePointRootIndex(context, segments);
  const rootLabel =
    context.siteType === 'onedrive-personal'
      ? 'マイファイル'
      : segments[rootIndex];
  const folderSegments = segments.slice(rootIndex + 1);
  const basePathSegments = segments.slice(0, rootIndex + 1);

  const result: BreadcrumbSegment[] = [{ label: rootLabel, url: null }];

  folderSegments.forEach((name, index) => {
    const partialPath = [
      ...basePathSegments,
      ...folderSegments.slice(0, index + 1),
    ];
    result.push({ label: name, url: buildLinkForPath(context, partialPath) });
  });

  return result;
}

// SharePointでは起点ラベル(ドキュメントライブラリ名)が複数サイトで重複しやすく、どのサイトの資料か
// 分かりにくいため、呼び出し側(index.ts)がDOMから読み取ったサイト名で起点ラベルのみを置き換える。
// urlは常にnull(起点はリンクを持たない)のため変更しない。
export function replaceRootLabel(
  segments: BreadcrumbSegment[],
  label: string
): BreadcrumbSegment[] {
  if (segments.length === 0) {
    return segments;
  }

  return [{ label, url: null }, ...segments.slice(1)];
}
