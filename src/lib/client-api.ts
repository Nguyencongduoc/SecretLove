export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers:
      body instanceof FormData || body === undefined
        ? undefined
        : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError('The service could not respond. Please try again.', response.status);
  }
  if (!response.ok)
    throw new ApiError(
      result.error?.message ?? 'The request could not finish.',
      response.status,
      result.error?.code,
    );
  return result.data as T;
}
