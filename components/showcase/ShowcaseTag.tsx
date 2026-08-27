import Link from 'next/link';
import Tag from '@/components/ui/Tag';

/** A project tag, linked to the showcase filtered by that tag — tags are the cheapest discovery path on the page. */
export default function ShowcaseTag({ tag }: { tag: string }) {
  return (
    <Link
      href={`/showcase?q=${encodeURIComponent(tag)}`}
      aria-label={`Filter projects by tag ${tag}`}
      className="inline-block rounded-sm transition-colors duration-300 ease-[var(--ease-ios)] hover:opacity-75 active:scale-95"
    >
      <Tag variant="gray" size="sm">{tag}</Tag>
    </Link>
  );
}
