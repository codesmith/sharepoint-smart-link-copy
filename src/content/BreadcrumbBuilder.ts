import type { BreadcrumbResult, BreadcrumbSegment } from '../shared/types';

const SEPARATOR = ' > ';
// 全角スペース(U+3000) + ┗(U+2517) + 半角スペース。全角スペースはHTMLでも空白が畳み込まれない
const ITEM_LINE_PREFIX = '　┗ ';
const TEXT_LINE_BREAK = '\n';
const HTML_LINE_BREAK = '<br>';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toSegmentHtml(segment: BreadcrumbSegment): string {
  const label = escapeHtml(segment.label);
  if (!segment.url) {
    return label;
  }
  return `<a href="${escapeHtml(segment.url)}">${label}</a>`;
}

export function buildBreadcrumbResult(
  segments: BreadcrumbSegment[],
  selectedItems: string[] = []
): BreadcrumbResult {
  const breadcrumbText = segments
    .map((segment) => segment.label)
    .join(SEPARATOR);
  const breadcrumbHtml = segments
    .map((segment) => toSegmentHtml(segment))
    .join(SEPARATOR);

  const textLines = [
    breadcrumbText,
    ...selectedItems.map((name) => `${ITEM_LINE_PREFIX}${name}`),
  ];
  const htmlLines = [
    breadcrumbHtml,
    ...selectedItems.map((name) => `${ITEM_LINE_PREFIX}${escapeHtml(name)}`),
  ];

  return {
    segments,
    selectedItems,
    html: htmlLines.join(HTML_LINE_BREAK),
    text: textLines.join(TEXT_LINE_BREAK),
  };
}
