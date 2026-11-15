import Tag, { type TagSize } from '@/components/ui/Tag';
import { SkeletonText } from '@/components/ui/skeleton';

/**
 * A linked tag (blog, showcase) while it loads: the real chip's box with a bar for its word. Tags
 * sit in an inline-block link, so the wrapper keeps that link's line box.
 */
export const TagBar = ({ size }: { size: TagSize }) => (
  <span className="inline-block">
    <Tag variant="gray" size={size}>
      <SkeletonText widths={['3.5rem']} />
    </Tag>
  </span>
);
