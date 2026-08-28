import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ShowcaseDetailPage from '@/components/pages/ShowcaseDetailPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';
import { findPublishedShowcaseProject } from '@/lib/showcase-server';
import { SITE_URL } from '@/app/metadata';

interface PageProps {
  params: Promise<{ id: string }>;
}

const FALLBACK_IMAGE = '/images/logo-highdef.png';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await findPublishedShowcaseProject(id);

  if (!project) {
    return {
      title: 'Showcase',
      description: 'AI projects built by UU AI Society members.',
    };
  }

  const url = `${SITE_URL}/showcase/${project.slug || project.id}`;
  const image = project.coverImage || FALLBACK_IMAGE;
  // The society travels with the project wherever the link is pasted.
  const description = `${project.description} — built by ${project.creatorName || 'a member'} of the UU AI Society.`;

  return {
    title: project.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: project.title,
      description,
      type: 'article',
      url,
      siteName: 'UU AI Society',
      images: [{ url: image, width: 1200, height: 630, alt: `${project.title} project cover` }],
      ...(project.createdAt ? { publishedTime: new Date(project.createdAt).toISOString() } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description,
      images: [image],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  // The readable URL is the canonical one.
  const project = await findPublishedShowcaseProject(id);
  if (project?.slug && project.slug !== id) {
    redirect(`/showcase/${project.slug}`);
  }

  return (
    <ErrorBoundaryWrapper>
      <ShowcaseDetailPage projectId={id} />
    </ErrorBoundaryWrapper>
  );
}
