import type { ClipboardContent } from '../shared/types';
import { BreadcrumbResolutionError } from '../shared/errors.js';

export class ClipboardWriter {
  async write(content: ClipboardContent): Promise<void> {
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([content.html], { type: 'text/html' }),
        'text/plain': new Blob([content.text], { type: 'text/plain' }),
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
