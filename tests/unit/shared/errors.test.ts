import { describe, it, expect } from 'vitest';
import { BreadcrumbResolutionError } from '../../../src/shared/errors';

describe('BreadcrumbResolutionError', () => {
  it('messageとcauseを保持する', () => {
    // Given: 準備
    const message = 'フォルダー階層を取得できませんでした';

    // When: 実行
    const error = new BreadcrumbResolutionError(message, 'url-parse-failed');

    // Then: 検証
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('BreadcrumbResolutionError');
    expect(error.message).toBe(message);
    expect(error.cause).toBe('url-parse-failed');
    expect(error.sourceError).toBeUndefined();
  });

  it('sourceErrorを指定した場合、元の例外を保持する', () => {
    // Given: 準備
    const original = new DOMException('denied', 'NotAllowedError');

    // When: 実行
    const error = new BreadcrumbResolutionError(
      '失敗',
      'clipboard-write-failed',
      original
    );

    // Then: 検証
    expect(error.sourceError).toBe(original);
  });

  it.each([
    'url-parse-failed',
    'backlog-issue-not-found',
    'clipboard-write-failed',
  ] as const)('causeに%sを設定できる', (cause) => {
    // Given/When: 準備と実行
    const error = new BreadcrumbResolutionError('エラー', cause);

    // Then: 検証
    expect(error.cause).toBe(cause);
  });
});
