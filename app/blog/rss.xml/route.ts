import { getPublishedBlogPosts } from '@/lib/blog-server';
import { SITE_URL } from '@/app/metadata';
import { postPath } from '@/lib/slugify';

export const runtime = 'nodejs';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Make arbitrary text safe inside a CDATA section (split any `]]>` sequence). */
function cdataSafe(value: string): string {
  return value.replace(/]]>/g, ']]]]><![CDATA[>');
}

function formatRfc822(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

export async function GET() {
  const posts = await getPublishedBlogPosts();

  const items = posts
    .map((post) => {
      const link = `${SITE_URL}/blog/${postPath(post)}`;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${formatRfc822(post.date)}</pubDate>
      <description><![CDATA[${cdataSafe(post.excerpt || '')}]]></description>
      <category>${escapeXml(post.authorType === 'ai' ? 'AI News Desk' : 'From the Team')}</category>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>UU AI Society Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>News and insights from the UU AI Society — editorials from our team and AI-generated digests from the AI News Desk.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
