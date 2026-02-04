export type Course = {
  id: string;
  title: string;
  code: string;
  link: string;
  description: string;
  Learning_outcomes: string;
  tags: string[];
  relatedCourses: string[];
  requirements?: string[];
  generalRequirements?: string[]; // non-course textual requirements
  level?: 'Preparatory' | "Bachelor's" | "Master's";
};

type RawCourse = {
  Link?: string;
  Course_name?: string;
  period?: string;
  credits?: string;
  level?: string;
  language?: string;
  location?: string;
  entry_requirements?: string;
  selection?: string;
  teaching_form?: string;
  course_content?: string;
  Learning_outcomes?: string;
  Instruction?: string;
  Assessment?: string;
  Syllabus?: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractCodeFromLink(url?: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const q = u.searchParams.get('query');
    return q || '';
  } catch {
    return '';
  }
}

function normalizeLevel(lvl?: string): Course['level'] | undefined {
  if (!lvl) return undefined;
  const v = lvl.toLowerCase();
  if (v.includes('preparatory')) return 'Preparatory';
  if (v.includes("bachelor")) return "Bachelor's";
  if (v.includes("master")) return "Master's";
  return undefined;
}

async function loadData(): Promise<Course[]> {
  const data = (await import("@/data/courses.json")) as unknown as { default: RawCourse[] };
  const raw = data.default || [];
  return raw.map((r, idx) => {
    const title = r.Course_name?.trim() || 'Untitled Course';
    const idBase = slugify(title) + "-" + idx;
    const id = idBase || `course-${idx}`;
    const link = r.Link || '';
    const code = extractCodeFromLink(link) || '';
    const credits = r.credits ? `${r.credits} credits` : '';
    const level = normalizeLevel(r.level);
    const description = (r.course_content && r.course_content.trim()) || '';
    const Learning_outcomes = r.Learning_outcomes || '';
    const tags = [
      ...(credits ? [credits] : []),
      ...(r.language ? [r.language] : []),
      ...(r.location ? [r.location] : []),
      ...(level ? [level] : []),
    ];
    const generalRequirements = r.entry_requirements ? [r.entry_requirements] : [];
    return {
      id,
      title,
      code,
      link,
      description,
      Learning_outcomes,
      tags,
      relatedCourses: [],
      requirements: [],
      generalRequirements,
      level,
    } as Course;
  });
}

export async function fetchCourses(): Promise<Course[]> {
  const courses = await loadData();
  if(!courses) {
    console.error('Failed to fetch courses ');  
    throw new Error('Failed to fetch courses');
  }
  return courses;
}

export async function fetchCourseById(id: string): Promise<Course | undefined> {
  const courses = await loadData();
  if(!courses) {
    console.error('Failed to fetch course by id');  
    throw new Error('Failed to fetch course by id');
  }
  return courses.find((c) => c.id === id);
}

export async function searchCourses(query: string): Promise<Course[]> {
  const courses = await loadData();
  if(!courses) {
    console.error('Failed to search courses');  
    throw new Error('Failed to search courses');
  }
  const q = query.trim().toLowerCase();
  if (!q) return courses;
  return courses.filter((c) =>
    c.title.toLowerCase().includes(q) ||
    c.description.toLowerCase().includes(q) ||
    c.tags.some((t) => t.toLowerCase().includes(q)) ||
    c.link.toLowerCase().includes(q)
  );
}
