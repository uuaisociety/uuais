/** Royalty-free preview images the blog rotates through when a post has no image.
 *  All from Unsplash (Unsplash License — free to use, no attribution required). */
export const BLOG_PREVIEW_IMAGES = [
  '/images/campus.png',
  '/images/blog-preview/blog-robot-ai.jpg',
  '/images/blog-preview/blog-abstract-tech.jpg',
  '/images/blog-preview/blog-circuit.jpg',
  '/images/blog-preview/blog-data-center.jpg',
  '/images/blog-preview/blog-neural.jpg',
  '/images/blog-preview/blog-abstract-blue.jpg',
  '/images/blog-preview/blog-servers.jpg',
];

/** Pick a stable preview image for a given seed (post id/title) so the same
 *  post always shows the same image, but different posts get different ones. */
export function previewImageFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const index = ((hash % BLOG_PREVIEW_IMAGES.length) + BLOG_PREVIEW_IMAGES.length) % BLOG_PREVIEW_IMAGES.length;
  return BLOG_PREVIEW_IMAGES[index];
}
