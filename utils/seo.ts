export const updatePageMeta = (title: string, description?: string) => {
  document.title = `${title} | UU AI Society`;
  
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && description) {
    metaDescription.setAttribute('content', description);
  }
};

export const generateStructuredData = (type: 'Organization' | 'Event', data: any) => {
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