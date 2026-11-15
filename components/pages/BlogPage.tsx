'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Calendar,
  User,
  Search,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardMedia } from '@/components/ui/Card';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { format } from 'date-fns';
import Tag from '@/components/ui/Tag';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  BlogHero,
  BlogSkeleton,
  CARD_BODY_CLASS,
  CARD_CLASS,
  CARD_EXCERPT_CLASS,
  CARD_MEDIA_CLASS,
  CARD_META_CLASS,
  CARD_TAGS_CLASS,
  CARD_TITLE_CLASS,
  CONTENT_CLASS,
  FEATURED_BODY_CLASS,
  FEATURED_EXCERPT_CLASS,
  FEATURED_META_CLASS,
  FEATURED_TITLE_CLASS,
  GRID_CLASS,
  PAGE_CLASS,
  RssLink,
  SEARCH_TRIGGER_CLASS,
  SECTIONS_CLASS,
  SectionHead,
  TOOLBAR_CLASS,
} from '@/components/blog/BlogLayout';
import type { BlogPost } from '@/types';

import { postPath } from '@/lib/slugify';
import { previewImageFor } from '@/lib/blog-preview';

const AI_SECTION_CAP = 6;

const BlogPage: React.FC = () => {
  const { state } = useApp();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [searchTerm, setSearchTerm] = useState(q);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAllAi, setShowAllAi] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    updatePageMeta(
      'Blog',
      'Read the latest articles and insights from UU AI Society members and industry experts',
    );
  }, []);

  // Adopt ?q= on navigation, but never sync back in an effect — a two-way sync ping-pongs.
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setSearchTerm(q);
  }

  // Written only on a real edit, so the URL stays shareable without driving a re-render.
  const updateSearch = (next: string) => {
    setSearchTerm(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('q', next);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url.toString());
  };

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const filteredPosts = state.blogPosts
    .filter((post) => post.published)
    .filter((post) => {
      const searchLower = searchTerm.toLowerCase();
      if (!searchLower) return true;
      const contentLower = post.content.replace(/<[^>]+>/g, ' ').toLowerCase();
      return (
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower) ||
        post.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
        contentLower.includes(searchLower)
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Admin-pinned hero article; falls back to the newest post. Hidden during search.
  const featuredPost = searchTerm
    ? undefined
    : filteredPosts.find((post) => post.featured) || filteredPosts[0];
  const rest = featuredPost
    ? filteredPosts.filter((post) => post.id !== featuredPost.id)
    : filteredPosts;
  const teamPosts = rest.filter((post) => post.authorType !== 'ai');
  const aiPosts = rest.filter((post) => post.authorType === 'ai');
  const aiPostsVisible = showAllAi ? aiPosts : aiPosts.slice(0, AI_SECTION_CAP);

  const renderTags = (post: BlogPost, size: 'sm' | 'md') => (
    <div className="flex flex-wrap gap-2">
      {post.tags.slice(0, size === 'sm' ? 2 : 3).map((tag, index) => (
        <Link
          key={index}
          href={`/blog?q=${encodeURIComponent(tag)}`}
          className="inline-block rounded-sm hover:opacity-75 active:scale-95 transition-all duration-150 cursor-pointer"
          aria-label={`Filter articles by tag ${tag}`}
        >
          <Tag variant={size === 'sm' ? 'gray' : 'red'} size={size}>
            {tag}
          </Tag>
        </Link>
      ))}
    </div>
  );

  const renderPostGrid = (posts: BlogPost[]) => (
    <div className={GRID_CLASS}>
      {posts.map((post) => (
        <Card key={post.id} variant="glass" className={CARD_CLASS}>
          <Link
            href={`/blog/${postPath(post)}`}
            aria-label={`Open ${post.title}`}
            className="block"
          >
            <CardMedia
              src={post.image || previewImageFor(post.id)}
              alt={post.title}
              fill
              className={CARD_MEDIA_CLASS}
            />
          </Link>

          <CardContent className={CARD_BODY_CLASS}>
            <div className={CARD_TAGS_CLASS}>
              {post.featured && (
                <Tag variant="yellow" size="sm">
                  Featured
                </Tag>
              )}
              {post.authorType === 'ai' && (
                <Tag variant="blue" size="sm">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI News Desk
                </Tag>
              )}
              {post.authorType === 'ai' && (
                <Tag variant="green" size="sm">
                  Beta
                </Tag>
              )}
              {renderTags(post, 'sm')}
            </div>

            <h3 className={CARD_TITLE_CLASS}>
              <Link
                href={`/blog/${postPath(post)}`}
                className="hover:text-primary transition-colors"
              >
                {post.title}
              </Link>
            </h3>

            <p className={CARD_EXCERPT_CLASS}>{post.excerpt}</p>

            <div className={CARD_META_CLASS}>
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" aria-hidden />
                <span className="mono-meta">{post.author}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                <span className="mono-meta">
                  {format(new Date(post.date), 'MMM d, yyyy')}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!state.blogPostsLoaded) {
    return <BlogSkeleton />;
  }

  return (
    <div className={PAGE_CLASS}>
      {/* Hero */}
      <BlogHero />

      <div className={CONTENT_CLASS}>
        {/* Articles toolbar: quiet expanding search + active filter */}
        <div className={TOOLBAR_CLASS}>
          {searchTerm && (
            <div className="flex items-center gap-2 min-w-0" aria-live="polite">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Filtered by
              </span>
              <button
                type="button"
                onClick={() => updateSearch('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-9 rounded-md border border-border bg-card text-sm text-foreground hover:bg-foreground/[0.05] transition-colors cursor-pointer truncate max-w-56"
              >
                <span className="truncate">{searchTerm}</span>
                <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </button>
            </div>
          )}
          <div className="ml-auto">
            {searchOpen ? (
              <div className="flex items-center gap-2 animate-in fade-in-0 zoom-in-95 duration-200">
                <input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => updateSearch(e.target.value)}
                  placeholder="Search titles, authors, content…"
                  aria-label="Search articles"
                  className="w-52 sm:w-72 bg-transparent border-b border-border pb-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors duration-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchOpen(false);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="grid place-items-center size-9 rounded-md text-current/60 hover:text-current hover:bg-current/[0.06] transition-colors duration-300 cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Search articles"
                    className={`${SEARCH_TRIGGER_CLASS} hover:text-current hover:bg-current/[0.06] transition-colors duration-300 cursor-pointer`}
                  >
                    <Search className="h-4 w-4" aria-hidden />
                    <span className="text-xs font-medium">Search</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Search articles
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No articles found
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? 'No articles match your search criteria.'
                : "We're working on creating amazing content for you!"}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => updateSearch('')}
                className="mt-4 text-sm text-primary hover:underline cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className={SECTIONS_CLASS}>
            {/* Featured Post */}
            {featuredPost && (
              <div>
                <SectionHead
                  eyebrow={"Editor's pick"}
                  title="Featured Article"
                />
                <Card variant="glass" className="overflow-hidden">
                  <div className="md:flex">
                    <div className="md:w-1/2">
                      <Link
                        href={`/blog/${postPath(featuredPost)}`}
                        aria-label={`Open ${featuredPost.title}`}
                        className="block h-full"
                      >
                        <CardMedia
                          src={
                            featuredPost.image ||
                            previewImageFor(featuredPost.id)
                          }
                          alt={featuredPost.title}
                          priority
                          fill
                          className="h-64 md:h-full"
                        />
                      </Link>
                    </div>
                    <div className={FEATURED_BODY_CLASS}>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Tag variant="yellow" size="md">
                          Featured
                        </Tag>
                        {featuredPost.authorType === 'ai' && (
                          <Tag variant="blue" size="md">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI News Desk
                          </Tag>
                        )}
                        {featuredPost.authorType === 'ai' && (
                          <Tag variant="green" size="md">
                            Beta
                          </Tag>
                        )}
                        {renderTags(featuredPost, 'md')}
                      </div>

                      <h3 className={FEATURED_TITLE_CLASS}>
                        <Link
                          href={`/blog/${postPath(featuredPost)}`}
                          className="hover:text-primary transition-colors"
                        >
                          {featuredPost.title}
                        </Link>
                      </h3>

                      <p className={FEATURED_EXCERPT_CLASS}>
                        {featuredPost.excerpt}
                      </p>

                      <div className={FEATURED_META_CLASS}>
                        <span className="inline-flex items-center gap-2">
                          <User className="h-4 w-4" aria-hidden />
                          <span className="mono-meta">
                            {featuredPost.author}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="h-4 w-4" aria-hidden />
                          <span className="mono-meta">
                            {format(new Date(featuredPost.date), 'MMM d, yyyy')}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* From the Team */}
            <div>
              <SectionHead eyebrow="The team" title="From the Team" />
              {teamPosts.length > 0 ? (
                renderPostGrid(teamPosts)
              ) : (
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'No team articles match your search.'
                    : 'No articles from the team yet — check back soon.'}
                </p>
              )}
            </div>

            {/* AI News Desk */}
            <div>
              <SectionHead eyebrow="Automated coverage" title="AI News Desk" />
              {aiPostsVisible.length > 0 ? (
                <>
                  {renderPostGrid(aiPostsVisible)}
                  {aiPosts.length > AI_SECTION_CAP && (
                    <div className="mt-8 flex justify-center">
                      <Button
                        variant="outline"
                        icon={showAllAi ? ChevronUp : ChevronDown}
                        onClick={() => setShowAllAi((v) => !v)}
                      >
                        {showAllAi
                          ? 'Show fewer'
                          : `View all ${aiPosts.length} digests`}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'No AI News Desk articles match your search.'
                    : 'No AI News Desk articles yet — check back soon.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* RSS subscribe */}
        <RssLink />
      </div>
    </div>
  );
};

export default BlogPage;
