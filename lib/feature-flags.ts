/**
 * The public Partners page (/partners) and the header/footer links to it.
 * Hidden until the partnership launch: while off, /partners returns 404, the
 * header and footer show no Partners link, and the footer keeps its original
 * "Our partners" logo row. Set NEXT_PUBLIC_PARTNERS_PAGE=true (Vercel env, or
 * .env.local to preview locally) to show it again; it is read at build time.
 *
 * Unaffected either way: CV upload on /account, the privacy policy, the partner
 * CV review at /partners/cvs, and the admin dashboard.
 *
 * When launching, also re-add the Partners line to public/llms.txt (a static
 * file, so it can't follow this flag):
 *   - [Partners](https://uuais.com/partners): Companies and organisations that partner with the society, by tier, and how to become one.
 */
export const PARTNERS_PAGE_PUBLIC =
  process.env.NEXT_PUBLIC_PARTNERS_PAGE === 'true';
