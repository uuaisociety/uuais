'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Calendar,
  User,
  Search,
  Sparkles,
  Rss,
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
import HeroSplash from '@/components/HeroSplash';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';
import { TagBar } from '@/components/ui/TagBar';
import type { BlogPost } from '@/types';

import { postPath } from '@/lib/slugify';
import { previewImageFor } from '@/lib/blog-preview';

const AI_SECTION_CAP = 6;

// ------------------------------------------------------------------ shared with the skeleton

const PAGE_CLASS = 'min-h-screen bg-background transition-colors pb-24';
const CONTENT_CLASS = 'max-w-7xl mx-auto px-5 sm:px-8';
const TOOLBAR_CLASS = 'flex flex-wrap items-center justify-between gap-4 pt-5';
const SEARCH_TRIGGER_CLASS =
  'inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-current/60';
const SECTIONS_CLASS = 'mt-8 space-y-14';
const GRID_CLASS = 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5';
const CARD_CLASS = 'h-full flex flex-col';
const CARD_MEDIA_CLASS = 'aspect-[16/10]';
const CARD_BODY_CLASS = 'p-5 flex flex-col flex-1';
const CARD_TAGS_CLASS = 'flex flex-wrap gap-2 mb-3';
const CARD_TITLE_CLASS = 'text-lg font-semibold text-foreground mb-3';
const CARD_EXCERPT_CLASS = 'text-muted-foreground text-sm mb-5 line-clamp-3';
const CARD_META_CLASS =
  'mt-auto flex items-center gap-4 text-xs text-muted-foreground';
const FEATURED_BODY_CLASS = 'md:w-1/2 p-8';
const FEATURED_TITLE_CLASS = 'text-2xl font-bold text-foreground mb-4';
const FEATURED_EXCERPT_CLASS = 'text-muted-foreground mb-6 leading-relaxed';
const FEATURED_META_CLASS =
  'flex items-center gap-5 text-sm text-muted-foreground';

export const BlogHero = () => (
  <HeroSplash>
    <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pt-32 pb-20">
      <p className="mono-label text-current/65 mb-6">
        UU AI Society · What&apos;s new
      </p>
      <h1 className="display-lg mb-4">Blog</h1>
      <p className="text-base sm:text-lg text-current/65 max-w-2xl leading-relaxed">
        News and insights from the UU AI Society — editorials from our team and
        AI-generated digests from the AI News Desk.
      </p>
    </div>
  </HeroSplash>
);

const SectionHead = ({
  eyebrow,
  title,
}: {
  eyebrow: React.ReactNode;
  title: string;
}) => (
  <>
    <p className="mono-label text-muted-foreground mb-2">{eyebrow}</p>
    <h2 className="display-md text-foreground mb-8">{title}</h2>
  </>
);

const RssLink = () => (
  <div className="mt-16 flex justify-center">
    <Link
      href="/blog/rss.xml"
      aria-label="Subscribe via RSS"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <Rss className="h-3.5 w-3.5" aria-hidden />
      Subscribe via RSS
    </Link>
  </div>
);

// AI News Desk cards always carry their two stream tags, which can wrap the tag row.
const CardSkeletons = ({ ai = false }: { ai?: boolean }) => (
  <div className={GRID_CLASS}>
    {[0, 1, 2].map((i) => (
      <Card key={i} variant="glass" className={CARD_CLASS} aria-hidden>
        {/* CardMedia's own box (h-48) plus the page's class. */}
        <SkeletonBox className={`w-full h-48 ${CARD_MEDIA_CLASS}`} />
        <CardContent className={CARD_BODY_CLASS}>
          <div className={CARD_TAGS_CLASS}>
            {ai && (
              <>
                <Tag variant="blue" size="sm">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI News Desk
                </Tag>
                <Tag variant="green" size="sm">
                  Beta
                </Tag>
              </>
            )}
            <TagBar size="sm" />
            <TagBar size="sm" />
          </div>
          <SkeletonText className={CARD_TITLE_CLASS} lines={2} />
          <SkeletonText className={CARD_EXCERPT_CLASS} lines={3} />
          <div className={CARD_META_CLASS}>
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <SkeletonText className="mono-meta" widths={['5rem']} />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <SkeletonText className="mono-meta" widths={['5.5rem']} />
            </span>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/** The blog while its posts load: the real hero and section heads, with the featured article and post cards as placeholders. */
export const BlogSkeleton = () => (
  <SkeletonRegion label="Loading articles…" className={PAGE_CLASS}>
    <BlogHero />
    <div className={CONTENT_CLASS}>
      <div className={TOOLBAR_CLASS}>
        <div className="ml-auto">
          <span aria-hidden className={SEARCH_TRIGGER_CLASS}>
            <Search className="h-4 w-4" />
            <span className="text-xs font-medium">Search</span>
          </span>
        </div>
      </div>
      <div className={SECTIONS_CLASS}>
        <div>
          <SectionHead eyebrow={"Editor's pick"} title="Featured Article" />
          <Card variant="glass" className="overflow-hidden" aria-hidden>
            <div className="md:flex">
              <div className="md:w-1/2">
                <SkeletonBox className="w-full h-64 md:h-full" />
              </div>
              <div className={FEATURED_BODY_CLASS}>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Tag variant="yellow" size="md">
                    Featured
                  </Tag>
                  <TagBar size="md" />
                  <TagBar size="md" />
                </div>
                <SkeletonText className={FEATURED_TITLE_CLASS} lines={2} />
                <SkeletonText className={FEATURED_EXCERPT_CLASS} lines={3} />
                <div className={FEATURED_META_CLASS}>
                  <span className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <SkeletonText className="mono-meta" widths={['6rem']} />
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <SkeletonText className="mono-meta" widths={['6rem']} />
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
        <div>
          <SectionHead eyebrow="The team" title="From the Team" />
          <CardSkeletons />
        </div>
        <div>
          <SectionHead eyebrow="Automated coverage" title="AI News Desk" />
          <CardSkeletons ai />
        </div>
      </div>
      <RssLink />
    </div>
  </SkeletonRegion>
);

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
