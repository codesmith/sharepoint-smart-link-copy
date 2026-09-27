// SharePoint/OneDriveのDOM構造は将来のUI変更で変わり得るため、複数の手掛かりを優先順に試す。
// 失敗しても例外にせず、選択なし(空配列)として扱う。実際のDOM構造は実機で検証・調整する前提。
const SELECTED_ROW_SELECTOR =
  '[role="row"][aria-selected="true"], [data-selection-index][aria-selected="true"]';

const NAME_ELEMENT_SELECTORS = [
  '[data-automationid="field-LinkFilename"]',
  '[data-automationid="field-displayName"]',
  '[data-automationid="FieldRenderer-name"]',
  '[data-automationid="name"]',
  '[data-automation-key="displayName"]',
];

const SHOW_TEXT = 4; // NodeFilter.SHOW_TEXT
const IGNORED_TEXT_PARENT_SELECTOR = '[aria-hidden="true"], script, style';

// 全角スペース(U+3000)を含むファイル名を壊さないよう、ASCIIの空白のみを正規化する
function normalizeName(value: string | null | undefined): string {
  return (value ?? '').replace(/[\t\n\r ]+/g, ' ').replace(/^ | $/g, '');
}

function findSelectedRows(root: ParentNode): Element[] {
  const matched = Array.from(root.querySelectorAll(SELECTED_ROW_SELECTOR));

  return matched
    .filter((row) => !row.querySelector('[role="columnheader"]'))
    .filter(
      (row) => !matched.some((other) => other !== row && other.contains(row))
    );
}

function readNameFromKnownElement(row: Element): string {
  for (const selector of NAME_ELEMENT_SELECTORS) {
    const name = normalizeName(row.querySelector(selector)?.textContent);
    if (name) {
      return name;
    }
  }
  return '';
}

function readNameFromFirstTextCell(row: Element): string {
  for (const cell of Array.from(row.querySelectorAll('[role="gridcell"]'))) {
    const name = normalizeName(cell.textContent);
    if (name) {
      return name;
    }
  }
  return '';
}

function readNameFromFirstTextNode(row: Element): string {
  const walker = row.ownerDocument.createTreeWalker(row, SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest(IGNORED_TEXT_PARENT_SELECTOR)) {
      continue;
    }
    const name = normalizeName(node.textContent);
    if (name) {
      return name;
    }
  }
  return '';
}

function readItemName(row: Element): string {
  return (
    readNameFromKnownElement(row) ||
    readNameFromFirstTextCell(row) ||
    readNameFromFirstTextNode(row)
  );
}

export function readSelectedItemNames(root: ParentNode): string[] {
  const names = findSelectedRows(root)
    .map((row) => readItemName(row))
    .filter((name) => name !== '');

  return Array.from(new Set(names));
}
