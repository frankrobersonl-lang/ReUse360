/**
 * Wraps an async job function with a maximum runtime guard.
 * If the job exceeds the timeout, it rejects with a descriptive error
 * so the processor can mark the ConnectorJob as FAILED.
 */
export const JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export class JobTimeoutError extends Error {
  constructor(jobId: string | undefined, timeoutMs: number) {
    const mins = Math.round(timeoutMs / 60_000);
    super(`Job timeout exceeded — job ${jobId ?? 'unknown'} did not complete within ${mins} minutes`);
    this.name = 'JobTimeoutError';
  }
}

export function withJobTimeout<T>(
  fn: () => Promise<T>,
  jobId: string | undefined,
  timeoutMs: number = JOB_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new JobTimeoutError(jobId, timeoutMs));
    }, timeoutMs);

    fn().then(
      (result) => { clearTimeout(timer); resolve(result); },
      (error)  => { clearTimeout(timer); reject(error); },
    );
  });
}
