import { MetadataRoute } from 'next'
/* import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'*/

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get all events from Firebase
  /* const eventsSnapshot = await getDocs(collection(db, 'events'))
  const events = eventsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) */

  const baseUrl = 'https://uuais.com'

  // Base routes
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ] as const

  // Add event routes
  /* const eventRoutes = events.map((event) => ({
    url: `${baseUrl}/events/${event.id}`,
    lastModified: new Date(event.updatedAt || event.createdAt),
    changeFrequency: 'weekly',
    priority: 0.6,
  })) */

  /* return [...routes, ...eventRoutes] */
  return [...routes]
}