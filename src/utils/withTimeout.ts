import i18next from 'i18next';

export class TimeoutError extends Error {
  constructor(messageKey: string) {
    super(i18next.t(messageKey));
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  errorKey: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new TimeoutError(errorKey)), ms)
  );
  return Promise.race([promise, timeout]);
}
