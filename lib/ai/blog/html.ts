/**
 * Ensure every h2/h3 heading starts on its own line in generated article HTML,
 * so the raw content stays readable in the editor. Adds a line break before an
 * opening heading and after a closing heading when one is missing.
 */
export function normalizeContentHtml(html: string): string {
  let out = html.trim();
  // Line break before an opening <h2>/<h3> unless already preceded by a newline.
  out = out.replace(/(^|[^\n])(<h[23][^>]*>)/gi, (_match, before: string, tag: string) => `${before}\n${tag}`);
  // Line break after a closing </h2>/</h3> unless already followed by a newline.
  out = out.replace(/(<\/h[23]>)([^\n])/gi, (_match, close: string, after: string) => `${close}\n${after}`);
  return out;
}
