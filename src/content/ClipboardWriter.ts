import type { BreadcrumbResult } from '../shared/types';
import { BreadcrumbResolutionError } from '../shared/errors.js';

export class ClipboardWriter {
  async write(result: BreadcrumbResult): Promise<void> {
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([result.html], { type: 'text/html' }),
        'text/plain': new Blob([result.text], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
    } catch (error) {
      throw new BreadcrumbResolutionError(
        'クリップボードへの書き込みに失敗しました',
        'clipboard-write-failed',
        error
      );
    }
  }
}
