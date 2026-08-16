'use client'

import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardMedia } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar, User, Sparkles, ExternalLink, Clock, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { incrementBlogRead } from '@/lib/firestore/analytics';
import Tag from '@/components/ui/Tag';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { postPath } from '@/lib/slugify';
import { previewImageFor } from '@/lib/blog-preview';
import BlogReactions from '@/components/blog/BlogReactions';

interface BlogDetailPageProps {
  /** Firestore id or slug of the post. Falls back to the route param. */
  postId?: string;
}

const BlogDetailPage: React.FC<BlogDetailPageProps> = ({ postId }) => {
  const params = useParams();
  const blogId = postId || (params.id as string);
  const { state } = useApp();
  const [showReasoning, setShowReasoning] = useState(false);

  const blogPost = state.blogPosts.find(post => post.slug === blogId || post.id === blogId);

  // Set dynamic page title based on blog post
  useEffect(() => {
    if (blogPost) {
      updatePageMeta(blogPost.title, blogPost.excerpt || '');
    }
  }, [blogPost]);

  // Increment unique blog read on mount (keyed by the post's Firestore id)
  useEffect(() => {
    if (blogPost) {
      incrementBlogRead(blogPost.id).catch(() => {});
    }
  }, [blogPost]);

  if (!state.blogPostsLoaded) {
    return (
      <div className="min-h-screen bg-background pt-24 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-foreground/10 rounded w-2/3" />
            <div className="h-64 bg-foreground/10 rounded" />
            <div className="h-4 bg-foreground/10 rounded w-3/4" />
            <div className="h-4 bg-foreground/10 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!blogPost) {
    notFound();
  }

  const relatedEventIds = blogPost.relatedEventIds;
  const relatedEvents = relatedEventIds
    ? state.events.filter(event => relatedEventIds.includes(event.id))
    : [];
  const readingMinutes = Math.max(1, Math.round(blogPost.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 220));

  const relatedPosts = state.blogPosts
    .filter(post => post.id !== blogPost.id && post.published)
    .map(post => {
      const overlap = (post.tags || []).filter(tag => (blogPost.tags || []).includes(tag)).length;
      const sameStream = post.authorType === blogPost.authorType ? 1 : 0;
      return { post, overlap, sameStream };
    })
    .sort((a, b) => {
      if (a.overlap !== b.overlap) return b.overlap - a.overlap;
      if (a.sameStream !== b.sameStream) return b.sameStream - a.sameStream;
      return new Date(b.post.date).getTime() - new Date(a.post.date).getTime();
    })
    .map(entry => entry.post)
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background pt-24 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/blog">
          <Button variant="outline" className="min-h-11 mb-8" icon={ArrowLeft}>
            Back to Blog
          </Button>
        </Link>

        {/* Blog Post Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {blogPost.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground mb-6">
            <span className="inline-flex items-center gap-2">
              <User className="w-4 h-4" aria-hidden />
              <span className="mono-meta">{blogPost.author}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" aria-hidden />
              <span className="mono-meta">{format(new Date(blogPost.date), 'MMMM dd, yyyy')}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="w-4 h-4" aria-hidden />
              <span className="mono-meta">{readingMinutes} min read</span>
            </span>
            {blogPost.authorType === 'ai' && blogPost.aiModel && (
              <span className="inline-flex items-center gap-2">
                <Bot className="w-4 h-4" aria-hidden />
                <span className="mono-meta">{blogPost.aiModel}</span>
              </span>
            )}
          </div>

          {/* Tags */}
          {(blogPost.authorType === 'ai' || (blogPost.tags && blogPost.tags.length > 0)) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {blogPost.authorType === 'ai' && (
                <Tag variant="blue" size="md">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI News Desk
                </Tag>
              )}
              {blogPost.tags.map((tag, index) => (
                <Link
                  key={index}
                  href={`/blog?q=${encodeURIComponent(tag)}`}
                  className="inline-block rounded-sm hover:opacity-75 active:scale-95 transition-all duration-150 cursor-pointer"
                  aria-label={`Filter articles by tag ${tag}`}
                >
                  <Tag variant="red" size="md">{tag}</Tag>
                </Link>
              ))}
            </div>
          )}

          {/* Excerpt */}
          <p className="text-xl text-muted-foreground leading-relaxed">
            {blogPost.excerpt}
          </p>

          {blogPost.authorType === 'ai' && (
            <div className="border border-primary/15 bg-primary/[0.04] text-muted-foreground px-4 py-3 rounded-lg flex items-start gap-3 mt-6">
              <Sparkles className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <p className="text-sm leading-relaxed">
                Generated by AI with the UU AI Society AI News Desk. Reviewed by {blogPost.reviewedBy || 'the UUAIS team'}.
              </p>
            </div>
          )}
        </div>

        {/* Featured Image */}
        {blogPost.image && (
          <div className="mb-8">
            <Image
              src={blogPost.image || previewImageFor(blogPost.id)}
              alt={blogPost.title}
              width={800}
              height={400}
              priority
              className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-xl shadow-lg"
            />
          </div>
        )}

        {/* Blog Content */}
        <Card className="h-full pt-4">
          <CardContent className="p-8">
            <div
              className="prose prose-lg max-w-xl mx-auto dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground prose-blockquote:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blogPost.content) }}
            />
          </CardContent>
        </Card>

        {/* Reactions + Share */}
        <div className="mt-12">
          <p className="mono-label text-muted-foreground mb-4">
            React to this article
          </p>
          <BlogReactions postId={blogPost.id} />
        </div>

        {/* Sources */}
        {blogPost.sources && blogPost.sources.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Sources
            </h3>
            <ul className="space-y-3">
              {blogPost.sources.map((source, index) => (
                <li key={index}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Reasoning trace */}
        {blogPost.authorType === 'ai' && blogPost.reasoningTrace && (
          <div className="mt-12">
            <Button
              variant="outline"
              className="min-h-11"
              icon={showReasoning ? ChevronUp : ChevronDown}
              onClick={() => setShowReasoning(v => !v)}
            >
              {showReasoning ? 'Hide' : 'View'} full reasoning trace
            </Button>
            {showReasoning && (
              <div className="mt-4 rounded-lg border border-border bg-foreground/[0.03] p-4">
                <p className="text-xs text-muted-foreground mb-3">
                  The raw reasoning the AI News Desk model produced while writing this article.
                </p>
                <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground leading-relaxed max-h-96 overflow-y-auto">
                  {blogPost.reasoningTrace}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Related Events */}
        {relatedEvents.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Related Events
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {relatedEvents.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card variant="glass" className="h-full">
                    <CardContent className="p-6">
                      <h4 className="text-lg font-semibold text-foreground mb-2">
                        {event.title}
                      </h4>
                      <p className="text-muted-foreground text-sm mb-2">
                        {format(new Date(event.eventStartAt), 'MMMM d, yyyy')}
                      </p>
                      {event.location && (
                        <p className="text-muted-foreground text-sm">
                          {event.location}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12">
          <h3 className="text-2xl font-bold text-foreground mb-6">
            Related Posts
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {relatedPosts.map((post) => (
                <Card key={post.id} variant="glass" className="h-full">
                  <CardContent className="p-6">
                    {post.image && (
                      <CardMedia
                        src={post.image}
                        alt={post.title}
                        fill
                        className="h-32 rounded-lg mb-4"
                      />
                    )}
                    <h4 className="text-lg font-semibold text-foreground mb-2">
                      {post.title}
                    </h4>
                    <p className="text-muted-foreground text-sm mb-4">
                      {post.excerpt}
                    </p>
                    <Link href={`/blog/${postPath(post)}`}>
                      <Button variant="outline" size="sm" className="min-h-11">
                        Read More
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default BlogDetailPage;
