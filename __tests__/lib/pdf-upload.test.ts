import {
  MAX_PDF_BYTES,
  sanitizePdfFileName,
  validatePdfFile,
} from '@/lib/pdf-upload';

describe('sanitizePdfFileName', () => {
  it('strips path separators so filenames cannot escape their folder', () => {
    expect(sanitizePdfFileName('../../evil.pdf')).toBe('.._.._evil.pdf');
    expect(sanitizePdfFileName('a\\b.pdf')).toBe('a_b.pdf');
  });

  it('strips control characters and caps the length', () => {
    expect(sanitizePdfFileName('cv\u0000\u001f.pdf')).toBe('cv.pdf');
    expect(sanitizePdfFileName('x'.repeat(500))).toHaveLength(200);
  });
});

describe('validatePdfFile', () => {
  it('accepts a file with the PDF header', async () => {
    const file = new File(['%PDF-1.7 test'], 'cv.pdf', {
      type: 'application/pdf',
    });
    expect(await validatePdfFile(file, 'Resume')).toBeNull();
  });

  it('rejects a non-PDF mime type', async () => {
    const file = new File(['%PDF-1.7 test'], 'cv.pdf', { type: 'text/plain' });
    expect(await validatePdfFile(file, 'Resume')).toBe('Resume must be a PDF');
  });

  it('rejects oversized files', async () => {
    const file = new File([new Uint8Array(MAX_PDF_BYTES + 1)], 'cv.pdf', {
      type: 'application/pdf',
    });
    expect(await validatePdfFile(file, 'File')).toBe('File must be <= 3MB');
  });

  it('rejects files without the PDF header', async () => {
    const file = new File(['not a pdf'], 'cv.pdf', { type: 'application/pdf' });
    expect(await validatePdfFile(file, 'File')).toBe(
      'File does not appear to be a valid PDF',
    );
  });
});
