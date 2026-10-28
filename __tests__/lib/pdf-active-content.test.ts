import { deflateSync } from 'node:zlib';
import { findPdfActiveContent } from '@/lib/pdf-upload';

const pdf = (...parts: (string | Buffer)[]) =>
  Buffer.concat([
    Buffer.from('%PDF-1.7\n'),
    ...parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : p)),
    Buffer.from('\n%%EOF\n'),
  ]);

const stream = (body: Buffer) =>
  Buffer.concat([
    Buffer.from('4 0 obj << /Filter /FlateDecode >>\nstream\n'),
    body,
    Buffer.from('\nendstream\nendobj\n'),
  ]);

describe('findPdfActiveContent', () => {
  it('passes an ordinary PDF, including an /OpenAction that only sets the view', async () => {
    const page = deflateSync(
      Buffer.from('BT /F1 12 Tf (Anna Svensson - CV) Tj ET'),
    );
    expect(
      await findPdfActiveContent(
        pdf(
          '1 0 obj << /Type /Catalog /OpenAction [3 0 R /Fit] >> endobj\n',
          stream(page),
        ),
      ),
    ).toBeNull();
  });

  it('catches JavaScript, launch actions and embedded files', async () => {
    expect(
      await findPdfActiveContent(
        pdf(
          '1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >> endobj',
        ),
      ),
    ).toBe('JavaScript');
    expect(
      await findPdfActiveContent(
        pdf('1 0 obj << /S /Launch /F (cmd.exe) >> endobj'),
      ),
    ).toBe('Launch');
    expect(
      await findPdfActiveContent(
        pdf('1 0 obj << /Names << /EmbeddedFiles 2 0 R >> >> endobj'),
      ),
    ).toBe('EmbeddedFiles');
  });

  it('decodes #xx escapes that hide a name', async () => {
    expect(
      await findPdfActiveContent(
        pdf('1 0 obj << /S /J#61vaScript /J#53 (x) >> endobj'),
      ),
    ).toBe('JavaScript');
  });

  it('looks inside compressed streams (e.g. object streams)', async () => {
    const hidden = deflateSync(
      Buffer.from('<< /S /JavaScript /JS (this.exportDataObject()) >>'),
    );
    // A harmless stream first, so the scan must move on to the next one.
    const harmless = deflateSync(Buffer.from('BT (hello) Tj ET'));
    expect(
      await findPdfActiveContent(pdf(stream(harmless), stream(hidden))),
    ).toBe('JavaScript');
  });

  it('treats a decompression bomb as suspicious instead of inflating it all', async () => {
    const bomb = deflateSync(Buffer.alloc(40 * 1024 * 1024));
    expect(await findPdfActiveContent(pdf(stream(bomb)))).toBe(
      'oversized compressed stream',
    );
  });

  // Round-2 bypasses: each must now be caught or refused.
  const obj = (dict: string, body: Buffer) =>
    Buffer.concat([
      Buffer.from(`5 0 obj << ${dict} >>\nstream\n`),
      body,
      Buffer.from('\nendstream\nendobj\n'),
    ]);
  const action = Buffer.from('<< /S /JavaScript /JS (x) >>');

  it('decodes chained filters such as ASCIIHex + Flate', async () => {
    const hex = Buffer.from(deflateSync(action).toString('hex') + '>');
    expect(
      await findPdfActiveContent(
        pdf(obj('/Filter [/ASCIIHexDecode /FlateDecode]', hex)),
      ),
    ).toBe('JavaScript');
  });

  it('decodes ASCII85', async () => {
    const a85 = (buf: Buffer) => {
      let out = '';
      for (let i = 0; i < buf.length; i += 4) {
        const chunk = Buffer.concat([
          buf.subarray(i, i + 4),
          Buffer.alloc(4),
        ]).subarray(0, 4);
        let v = chunk.readUInt32BE(0);
        const digits: string[] = [];
        for (let k = 0; k < 5; k++) {
          digits.unshift(String.fromCharCode((v % 85) + 33));
          v = Math.floor(v / 85);
        }
        out += digits.join('').slice(0, Math.min(5, buf.length - i + 1));
      }
      return Buffer.from(`${out}~>`);
    };
    expect(
      await findPdfActiveContent(
        pdf(obj('/Filter /ASCII85Decode', a85(action))),
      ),
    ).toBe('JavaScript');
  });

  it('refuses filters it cannot decode instead of skipping them', async () => {
    expect(
      await findPdfActiveContent(
        pdf(obj('/Filter /LZWDecode', Buffer.from('xx'))),
      ),
    ).toBe('unsupported stream filter (LZWDecode)');
    expect(
      await findPdfActiveContent(
        pdf(obj('/Filter /FlateDecode', Buffer.from('not deflate'))),
      ),
    ).toBe('undecodable compressed stream');
  });

  it('uses /Length, so a literal "endstream" inside the data cannot hide what follows', async () => {
    const body = Buffer.concat([Buffer.from('BT endstream ET '), action]);
    expect(
      await findPdfActiveContent(pdf(obj(`/Length ${body.length}`, body))),
    ).toBe('JavaScript');
  });

  it('refuses a stream with no end, and finds streams after a bare CR', async () => {
    expect(
      await findPdfActiveContent(
        pdf(
          '5 0 obj << /Filter /FlateDecode >>\nstream\n',
          deflateSync(action),
        ),
      ),
    ).toBe('unterminated stream');
    const cr = Buffer.concat([
      Buffer.from('5 0 obj << /Filter /FlateDecode >>\nstream\r'),
      deflateSync(action),
      Buffer.from('\rendstream\rendobj\r'),
    ]);
    expect(await findPdfActiveContent(pdf(cr))).toBe('JavaScript');
  });

  it('accepts raw (headerless) deflate, as lenient readers do, and scans it', async () => {
    const { deflateRawSync } = await import('node:zlib');
    expect(
      await findPdfActiveContent(
        pdf(obj('/Filter /FlateDecode', deflateRawSync(action))),
      ),
    ).toBe('JavaScript');
  });

  it('refuses encrypted PDFs and non-image predictors', async () => {
    expect(
      await findPdfActiveContent(
        pdf('trailer << /Encrypt 9 0 R /Root 1 0 R >>'),
      ),
    ).toBe('encrypted PDF');
    expect(
      await findPdfActiveContent(
        pdf(
          obj(
            '/Filter /FlateDecode /DecodeParms << /Predictor 12 /Columns 4 >>',
            deflateSync(action),
          ),
        ),
      ),
    ).toBe('unsupported stream predictor');
  });

  it('does not mistake binary font or image data for names', async () => {
    const noisy = Buffer.from('xx/JS(yy/Launch zz');
    expect(
      await findPdfActiveContent(
        pdf(obj('/Filter /FlateDecode /Length1 18', deflateSync(noisy))),
      ),
    ).toBeNull();
    expect(
      await findPdfActiveContent(
        pdf(obj('/Subtype /Image /Filter /DCTDecode', noisy)),
      ),
    ).toBeNull();
  });

  it('still scans an object stream that pretends to be an image', async () => {
    expect(
      await findPdfActiveContent(
        pdf(
          obj(
            '/Type /ObjStm /Subtype /Image /Filter /FlateDecode',
            deflateSync(action),
          ),
        ),
      ),
    ).toBe('JavaScript');
  });
});
