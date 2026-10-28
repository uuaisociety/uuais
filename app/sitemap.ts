import { unstable_cache } from 'next/cache';
import { MetadataRoute } from 'next';
import { SITE_URL } from './metadata';
import { getPublicSeed } from '@/lib/server-data';
import { listPrograms, programSlug } from '@/lib/programs';
import {
  CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT,
  isCodexAmbassadorInterviewPublished,
} from '@/lib/content-publication';

// The sitemap must reflect the interview's exact release time instead of stale ISR output.
export const dynamic = 'force-dynamic';

async function loadDynamicSitemapRoutes(): Promise<MetadataRoute.Sitemap> {
  const loadEventRoutes = async (): Promise<MetadataRoute.Sitemap> => {
    try {
      const seed = await getPublicSeed();
      return seed.events
        .filter(
          (event) =>
            event.published &&
            event.eventStartAt &&
            new Date(event.eventStartAt) > new Date(),
        )
        .map((event) => ({
          url: `${SITE_URL}/events/${event.id}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.7,
        }));
    } catch {
      return [];
    }
  };

  const loadBlogRoutes = async (): Promise<MetadataRoute.Sitemap> => {
    try {
      const { getPublishedBlogPosts } = await import('@/lib/blog-server');
      const posts = await getPublishedBlogPosts();
      return posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug || post.id}`,
        lastModified: post.date ? new Date(post.date) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    } catch {
      return [];
    }
  };

  const loadShowcaseRoutes = async (): Promise<MetadataRoute.Sitemap> => {
    try {
      const { getPublishedShowcaseProjects } =
        await import('@/lib/showcase-server');
      const projects = await getPublishedShowcaseProjects();
      return projects.map((project) => ({
        url: `${SITE_URL}/showcase/${project.slug || project.id}`,
        lastModified: project.updatedAt
          ? new Date(project.updatedAt)
          : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    } catch {
      return [];
    }
  };

  const [eventRoutes, blogRoutes, showcaseRoutes] = await Promise.all([
    loadEventRoutes(),
    loadBlogRoutes(),
    loadShowcaseRoutes(),
  ]);

  return [...eventRoutes, ...blogRoutes, ...showcaseRoutes];
}

const getCachedDynamicSitemapRoutes = unstable_cache(
  loadDynamicSitemapRoutes,
  ['sitemap-dynamic-routes-v1', SITE_URL],
  { revalidate: 86400 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/careers`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/partners`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/join`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    // /explore and /projects/course-navigator are omitted while the navigator is
    // admin-only; they go back in when it launches.
    {
      url: `${baseUrl}/programs`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/showcase`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/apply`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/apply/team`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/board-apply`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ];

  if (isCodexAmbassadorInterviewPublished()) {
    routes.push({
      url: `${baseUrl}/events/codex-ambassador-interview`,
      lastModified: CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    });
  }

  // Every programme map. Read from the committed index rather than Firestore, so unlike the
  // routes below this cannot fail or come back empty.
  const programRoutes: MetadataRoute.Sitemap = listPrograms().map((entry) => ({
    url: `${baseUrl}/programs/${programSlug(entry)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const dynamicRoutes = await getCachedDynamicSitemapRoutes();

  return [...routes, ...programRoutes, ...dynamicRoutes];
}
