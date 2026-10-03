export type BreadcrumbResolutionErrorCause =
  | 'url-parse-failed'
  | 'backlog-issue-not-found'
  | 'clipboard-write-failed';

export class BreadcrumbResolutionError extends Error {
  constructor(
    message: string,
    public readonly cause: BreadcrumbResolutionErrorCause,
    // デバッグ用に元の例外を保持する(cause自体は分類用の文字列として使うため、
    // ES2022のError.causeとは別のプロパティで元エラーを保持する)
    public readonly sourceError?: unknown
  ) {
    super(message);
    this.name = 'BreadcrumbResolutionError';
  }
}
