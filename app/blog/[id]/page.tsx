import type { Metadata } from 'next';
import BlogDetailPage from '@/components/pages/BlogDetailPage';
import { findPublishedBlogPost } from '@/lib/blog-server';
import { SITE_URL } from '@/app/metadata';

interface PageProps {
  params: Promise<{ id: string }>;
}

const FALLBACK_IMAGE = '/images/logo-highdef.png';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await findPublishedBlogPost(id);

  if (!post) {
    return {
      title: 'Blog',
      description: 'News and insights from the UU AI Society.',
    };
  }

  const url = `${SITE_URL}/blog/${post.slug || post.id}`;
  const image = post.image || FALLBACK_IMAGE;

  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: 'article',
      url,
      siteName: 'UU AI Society',
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
      ...(post.date ? { publishedTime: new Date(post.date).toISOString() } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || undefined,
      images: [image],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <BlogDetailPage postId={id} />;
}
