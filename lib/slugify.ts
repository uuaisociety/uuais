/** Convert a title into a URL-safe slug. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 80) || 'post'
  );
}

/** Pick the shareable URL segment for a post: slug when present, else its Firestore id. */
export function postPath(post: { id: string; slug?: string }): string {
  return post.slug || post.id;
}
