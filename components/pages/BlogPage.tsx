'use client'

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Calendar, User, Search, Sparkles, Rss, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardMedia } from '@/components/ui/Card';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { format } from 'date-fns';
import Tag from '@/components/ui/Tag';
import HeroSplash from '@/components/HeroSplash';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { BlogPost } from '@/types';

import { postPath } from '@/lib/slugify';
import { previewImageFor } from '@/lib/blog-preview';

const AI_SECTION_CAP = 6;

const BlogPage: React.FC = () => {
  const { state } = useApp();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAllAi, setShowAllAi] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    updatePageMeta('Blog', 'Read the latest articles and insights from UU AI Society members and industry experts');
  }, []);

  // Keep the filter in sync with ?q= — including client-side navigation from tag links.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSearchTerm(q);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [q]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (searchTerm) url.searchParams.set('q', searchTerm);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url.toString());
  }, [searchTerm]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const filteredPosts = state.blogPosts
    .filter(post => post.published)
    .filter(post => {
      const searchLower = searchTerm.toLowerCase();
      if (!searchLower) return true;
      const contentLower = post.content.replace(/<[^>]+>/g, ' ').toLowerCase();
      return post.title.toLowerCase().includes(searchLower) ||
             post.excerpt.toLowerCase().includes(searchLower) ||
             post.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
             contentLower.includes(searchLower);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Admin-pinned hero article; falls back to the newest post. Hidden during search.
  const featuredPost = searchTerm ? undefined : (filteredPosts.find(post => post.featured) || filteredPosts[0]);
  const rest = featuredPost ? filteredPosts.filter(post => post.id !== featuredPost.id) : filteredPosts;
  const teamPosts = rest.filter(post => post.authorType !== 'ai');
  const aiPosts = rest.filter(post => post.authorType === 'ai');
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
          <Tag variant={size === 'sm' ? 'gray' : 'red'} size={size}>{tag}</Tag>
        </Link>
      ))}
    </div>
  );

  const renderPostGrid = (posts: BlogPost[]) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {posts.map((post) => (
        <Card key={post.id} variant="glass" className="h-full flex flex-col">
          <Link href={`/blog/${postPath(post)}`} aria-label={`Open ${post.title}`} className="block">
            <CardMedia
              src={post.image || previewImageFor(post.id)}
              alt={post.title}
              fill
              className="aspect-[16/10]"
            />
          </Link>

          <CardContent className="p-5 flex flex-col flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
              {post.featured && (
                <Tag variant="yellow" size="sm">Featured</Tag>
              )}
              {post.authorType === 'ai' && (
                <Tag variant="blue" size="sm">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI News Desk
                </Tag>
              )}
              {post.authorType === 'ai' && (
                <Tag variant="green" size="sm">Beta</Tag>
              )}
              {renderTags(post, 'sm')}
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-3">
              <Link
                href={`/blog/${postPath(post)}`}
                className="hover:text-primary transition-colors"
              >
                {post.title}
              </Link>
            </h3>

            <p className="text-muted-foreground text-sm mb-5 line-clamp-3">
              {post.excerpt}
            </p>

            <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" aria-hidden />
                <span className="mono-meta">{post.author}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                <span className="mono-meta">{format(new Date(post.date), 'MMM d, yyyy')}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!state.blogPostsLoaded) {
    return (
      <div className="min-h-screen bg-background transition-colors pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-24">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-foreground/10 rounded w-40" />
            <div className="h-64 bg-foreground/10 rounded-xl" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-xl overflow-hidden border border-border bg-card/70">
                  <div className="aspect-video bg-foreground/10" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 w-3/4 rounded bg-foreground/10" />
                    <div className="h-3 w-full rounded bg-foreground/5" />
                    <div className="h-3 w-2/3 rounded bg-foreground/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      {/* Hero */}
      <HeroSplash>
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pt-32 pb-20">
          <p className="mono-label text-current/65 mb-6">UU AI Society · What&apos;s new</p>
          <h1 className="display-lg mb-4">Blog</h1>
          <p className="text-base sm:text-lg text-current/65 max-w-2xl leading-relaxed">
            News and insights from the UU AI Society — editorials from our team and AI-generated digests from the AI News Desk.
          </p>
        </div>
      </HeroSplash>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Articles toolbar: quiet expanding search + active filter */}
        <div className="flex items-center justify-between gap-4 pt-5">
          {searchTerm && (
            <div className="flex items-center gap-2 min-w-0" aria-live="polite">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Filtered by</span>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                    className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-current/60 hover:text-current hover:bg-current/[0.06] transition-colors duration-300 cursor-pointer"
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
                : 'We\'re working on creating amazing content for you!'
              }
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mt-4 text-sm text-primary hover:underline cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-14">
            {/* Featured Post */}
            {featuredPost && (
              <div>
                <p className="mono-label text-muted-foreground mb-2">Editor&apos;s pick</p>
                <h2 className="display-md text-foreground mb-8">Featured Article</h2>
                <Card variant="glass" className="overflow-hidden">
                  <div className="md:flex">
                    <div className="md:w-1/2">
                      <Link href={`/blog/${postPath(featuredPost)}`} aria-label={`Open ${featuredPost.title}`} className="block h-full">
                        <CardMedia
                          src={featuredPost.image || previewImageFor(featuredPost.id)}
                          alt={featuredPost.title}
                          priority
                          fill
                          className="h-64 md:h-full"
                        />
                      </Link>
                    </div>
                    <div className="md:w-1/2 p-8">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Tag variant="yellow" size="md">Featured</Tag>
                        {featuredPost.authorType === 'ai' && (
                          <Tag variant="blue" size="md">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI News Desk
                          </Tag>
                        )}
                        {featuredPost.authorType === 'ai' && (
                          <Tag variant="green" size="md">Beta</Tag>
                        )}
                        {renderTags(featuredPost, 'md')}
                      </div>

                      <h3 className="text-2xl font-bold text-foreground mb-4">
                        <Link href={`/blog/${postPath(featuredPost)}`} className="hover:text-primary transition-colors">
                          {featuredPost.title}
                        </Link>
                      </h3>

                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {featuredPost.excerpt}
                      </p>

                      <div className="flex items-center gap-5 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <User className="h-4 w-4" aria-hidden />
                          <span className="mono-meta">{featuredPost.author}</span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="h-4 w-4" aria-hidden />
                          <span className="mono-meta">{format(new Date(featuredPost.date), 'MMM d, yyyy')}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* From the Team */}
            <div>
              <p className="mono-label text-muted-foreground mb-2">The team</p>
              <h2 className="display-md text-foreground mb-8">From the Team</h2>
              {teamPosts.length > 0 ? (
                renderPostGrid(teamPosts)
              ) : (
                <p className="text-muted-foreground">
                  {searchTerm ? 'No team articles match your search.' : 'No articles from the team yet — check back soon.'}
                </p>
              )}
            </div>

            {/* AI News Desk */}
            <div>
              <p className="mono-label text-muted-foreground mb-2">Automated coverage</p>
              <h2 className="display-md text-foreground mb-8">AI News Desk</h2>
              {aiPostsVisible.length > 0 ? (
                <>
                  {renderPostGrid(aiPostsVisible)}
                  {aiPosts.length > AI_SECTION_CAP && (
                    <div className="mt-8 flex justify-center">
                      <Button variant="outline" icon={showAllAi ? ChevronUp : ChevronDown} onClick={() => setShowAllAi(v => !v)}>
                        {showAllAi ? 'Show fewer' : `View all ${aiPosts.length} digests`}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  {searchTerm ? 'No AI News Desk articles match your search.' : 'No AI News Desk articles yet — check back soon.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* RSS subscribe */}
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
      </div>
    </div>
  );
};

export default BlogPage;
