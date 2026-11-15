import { CourseDetailSkeleton } from '@/components/courses/CourseDetailLayout';

// Shown straight away: the course page streams in after a Firestore read, and
// this is its own frame (back button, title panel, overview and facts grid).
export default function Loading() {
  return <CourseDetailSkeleton />;
}
