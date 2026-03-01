export const updatePageMeta = (title: string, description?: string) => {
  if (typeof document === 'undefined') return;

  document.title = `${title} | UU AI Society`;

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && description) {
    metaDescription.setAttribute('content', description);
  }
};

interface EventData {
  title: string;
  description: string;
  date: string;
  location: string;
}

export const generateStructuredData = (
  type: 'Organization' | 'Event',
  data?: EventData
) => {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  if (type === 'Organization') {
    return {
      ...baseData,
      name: 'UU AI Society',
      description: 'UU AI Society - Connecting students passionate about Artificial Intelligence',
      url: window.location.origin,
      logo: `${window.location.origin}/logo.png`,
      sameAs: [
        'https://linkedin.com/company/uu-ai-society',
      ]
    };
  }

  if (type === 'Event') {
    if (!data) {
      throw new Error('Event data is required when type is "Event"');
    }
    return {
      ...baseData,
      name: data.title,
      description: data.description,
      startDate: data.date,
      location: {
        '@type': 'Place',
        name: data.location
      },
      organizer: {
        '@type': 'Organization',
        name: 'UU AI Society'
      }
    };
  }

  return baseData;
};