import { MetadataRoute } from 'next'
import { SITE_URL } from './metadata'
import { getPublicSeed } from '@/lib/server-data'

// The data helpers below only touch the Admin SDK (no headers()/cookies()/fetch), so without a revalidation window the sitemap would be baked once at build time and newly published content would never appear.
export const revalidate = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL

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
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
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
      url: `${baseUrl}/projects/course-navigator`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
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
  ]

  // Dynamic published event URLs, reusing the public seed (degrades to empty if Firestore is unreachable).
  const loadEventRoutes = async (): Promise<MetadataRoute.Sitemap> => {
    try {
      const seed = await getPublicSeed()
      return seed.events
        .filter((e) => e.published && e.eventStartAt && new Date(e.eventStartAt) > new Date())
        .map((e) => ({
          url: `${baseUrl}/events/${e.id}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.7,
        }))
    } catch {
      // sitemap still serves the static routes
      return []
    }
  }

  // Dynamic published blog post URLs.
  const loadBlogRoutes = async (): Promise<MetadataRoute.Sitemap> => {
    try {
      const { getPublishedBlogPosts } = await import('@/lib/blog-server')
      const posts = await getPublishedBlogPosts()
      return posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug || post.id}`,
        lastModified: post.date ? new Date(post.date) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    } catch {
      // sitemap still serves the static + event routes
      return []
    }
  }

  // Dynamic published showcase project URLs.
  const loadShowcaseRoutes = async (): Promise<MetadataRoute.Sitemap> => {
    try {
      const { getPublishedShowcaseProjects } = await import('@/lib/showcase-server')
      const projects = await getPublishedShowcaseProjects()
      return projects.map((project) => ({
        url: `${baseUrl}/showcase/${project.slug || project.id}`,
        lastModified: project.updatedAt ? new Date(project.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    } catch {
      // sitemap still serves the static + event + blog routes
      return []
    }
  }

  // Each section is one Firestore query; running them concurrently cuts the on-demand (revalidated) generation time from three round-trips to one.
  const [eventRoutes, blogRoutes, showcaseRoutes] = await Promise.all([
    loadEventRoutes(),
    loadBlogRoutes(),
    loadShowcaseRoutes(),
  ])

  return [...routes, ...eventRoutes, ...blogRoutes, ...showcaseRoutes]
}