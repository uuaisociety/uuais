/** @jest-environment node */
import {
  getFormFile,
  readBoundedFormData,
  readBoundedRequest,
  readBoundedRequestBody,
} from '@/lib/bounded-request-body';

describe('readBoundedRequestBody', () => {
  it('accepts bodies within the byte limit', async () => {
    const result = await readBoundedRequestBody(
      new Request('http://local', { method: 'POST', body: '1234' }),
      4,
    );
    expect(new TextDecoder().decode(result)).toBe('1234');
  });

  it('rejects bodies that exceed the limit regardless of request metadata', async () => {
    const result = await readBoundedRequestBody(
      new Request('http://local', { method: 'POST', body: '12345' }),
      4,
    );
    expect(result).toBeNull();
  });

  it('bounds multipart data when content-length is absent and extracts only files', async () => {
    const form = new FormData();
    form.set('file', new Blob(['file']), 'file.txt');
    form.set('text', 'plain form value');
    const request = new Request('http://local', { method: 'POST', body: form });

    const parsed = await readBoundedFormData(request, 1024);
    expect(parsed && getFormFile(parsed, 'file')?.name).toBe('file.txt');
    expect(parsed && getFormFile(parsed, 'missing')).toBeNull();
    expect(parsed && getFormFile(parsed, 'text')).toBeNull();

    const oversized = await readBoundedFormData(
      new Request('http://local', {
        method: 'POST',
        body: new Blob([new Uint8Array(1025)]),
      }),
      1024,
    );
    expect(oversized).toBeNull();
  });

  it('rejects a declared oversized body before reading it', async () => {
    const request = new Request('http://local', {
      method: 'POST',
      headers: { 'content-length': '100' },
      body: 'x',
    });
    expect(await readBoundedFormData(request, 10)).toBeNull();
  });

  it('rejects actual oversized bytes despite a misleading small content-length', async () => {
    const request = new Request('http://local', {
      method: 'POST',
      headers: { 'content-length': '1' },
      body: '12345',
    });
    expect(await readBoundedRequest(request, 4)).toBeNull();
  });

  it('preserves malformed multipart parse errors', async () => {
    const request = new Request('http://local', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=missing' },
      body: 'not a multipart body',
    });
    await expect(readBoundedFormData(request, 100)).rejects.toThrow();
  });
});
