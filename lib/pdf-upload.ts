export const MAX_PDF_BYTES = 3 * 1024 * 1024;

/** Strips path separators and control characters so a filename cannot escape its destination folder. */
export function sanitizePdfFileName(name: string): string {
  return name
    .replace(/[/\\]/g, '_')
    .split('')
    .filter((c) => c.charCodeAt(0) >= 32)
    .join('')
    .slice(0, 200);
}

/** Returns an error message when the file is not an acceptable PDF, or null when it is. */
export async function validatePdfFile(
  file: File,
  label = 'File',
): Promise<string | null> {
  if (file.type !== 'application/pdf' && file.type !== '')
    return `${label} must be a PDF`;
  if (file.size > MAX_PDF_BYTES)
    return `${label} must be <= ${MAX_PDF_BYTES / (1024 * 1024)}MB`;
  const header = await file.slice(0, 5).text();
  if (header !== '%PDF-') return `${label} does not appear to be a valid PDF`;
  return null;
}
