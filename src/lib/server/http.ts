import 'server-only';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { appOrigin } from './env';

export function assertOrigin(request: Request) {
  if (request.headers.get('origin') !== appOrigin())
    throw new AppError(403, 'ORIGIN_DENIED', 'This request origin is not allowed.');
}
export async function bytes(request: Request, maximum: number) {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximum))
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'This request is too large.');
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > maximum) {
          await reader.cancel();
          throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'This request is too large.');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  return Buffer.concat(chunks);
}
export async function jsonBody(request: Request, maximum = 98304): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send JSON for this request.');
  try {
    return JSON.parse((await bytes(request, maximum)).toString('utf8'));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, 'VALIDATION_ERROR', 'Send a valid JSON body.');
  }
}
export function success(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export async function endpoint(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    const id = randomUUID();
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the form fields and try again.',
            requestId: id,
            fieldErrors: error.flatten().fieldErrors,
          },
        },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      );
    const problem =
      error instanceof AppError
        ? error
        : new AppError(
            503,
            'TEMPORARILY_UNAVAILABLE',
            'The service is temporarily unavailable. Please try again.',
          );
    // Log codes only; never credentials, content, URLs or provider error objects.
    if (problem.status >= 500) console.error(JSON.stringify({ requestId: id, code: problem.code }));
    return NextResponse.json(
      { error: { code: problem.code, message: problem.message, requestId: id } },
      {
        status: problem.status,
        headers: {
          'Cache-Control': 'private, no-store',
          ...(problem.status === 429 ? { 'Retry-After': '60' } : {}),
        },
      },
    );
  }
}
