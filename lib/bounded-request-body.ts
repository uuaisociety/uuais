export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readBoundedRequest(
  request: Request,
  maxBytes: number,
): Promise<Request | null> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBytes) return null;
  const body = await readBoundedRequestBody(request, maxBytes);
  if (!body) return null;
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
  });
}

export async function readBoundedFormData(
  request: Request,
  maxBytes: number,
): Promise<FormData | null> {
  const boundedRequest = await readBoundedRequest(request, maxBytes);
  return boundedRequest ? boundedRequest.formData() : null;
}

export function getFormFile(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  return typeof File !== 'undefined' && value instanceof File ? value : null;
}
export const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
