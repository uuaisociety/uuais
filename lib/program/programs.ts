
import { Program, ProgramCourse } from "../types/program";
import { fetchCoursesByIds, fetchCourses } from "../courses";
import { matchMultipleProgramCourses, CourseMapping } from "./course-mappings";

/**
 * Engineering Physics (TTF2Y) Program Data
 * Valid from Autumn 2026
 * 300 credits, Master's Program
 */

// Helper to parse course data from the program outline
// courseId is the Firestore document ID (e.g., "1TD722", "1DL301")
function createCourse(
  courseId: string,
  title: string,
  credits: number,
  isMandatory: boolean,
  fieldOfStudy?: string
): ProgramCourse {
  return {
    courseId,
    code: courseId, // code is also set to courseId for backward compatibility
    title: title.trim(),
    credits,
    isMandatory,
    fieldOfStudy: fieldOfStudy ? [fieldOfStudy] : undefined,
  };
}

// Engineering Physics TTF2Y Program Data
export const engineeringPhysicsProgram: Program = {
  id: "ttf2y",
  code: "TTF2Y",
  name: "Master's Program in Engineering Physics",
  credits: 300,
  validFrom: "Autumn 2026",
  finalizedBy: "The Faculty Board of Science and Technology, 6 November 2025",
  registrationNumber: "TEK-NAT 2025/139",
  
  requirements: {
    totalCredits: 300,
    mandatoryCredits: 165,
    electiveCredits: 135,
    categories: [
      {
        id: "g1n",
        name: "G1N Level Courses",
        minCredits: 30,
        courseCodes: [],
      },
      {
        id: "g1f",
        name: "G1F Level Courses",
        minCredits: 45,
        courseCodes: [],
      },
      {
        id: "g2f",
        name: "G2F Level Courses",
        minCredits: 45,
        courseCodes: [],
      },
      {
        id: "a1n",
        name: "A1N Level Courses",
        minCredits: 90,
        courseCodes: [],
      },
      {
        id: "a1f",
        name: "A1F Level Courses",
        minCredits: 60,
        courseCodes: [],
      },
      {
        id: "thesis",
        name: "Degree Project",
        minCredits: 30,
        courseCodes: ["1TE864"],
      },
    ],
  },

  tracks: [
    {
      id: "computational-engineering",
      name: "Computational Engineering",
      description: "Beräkningsteknik - Computational methods, machine learning, and scientific computing. Two profiles: AI and Applied Computational Engineering",
      requiredCourseIds: ["1TD343", "1TD352", "1TD354", "1RT700", "1TD722", "1TD452", "1TD184"],
      electiveCourseIds: [
        // Profile: AI
        "1DL301",
        "1TD396",
        "1TD389",
        "1FA370",
        "1TD169",
        "1MS926",
        "1RT720",
        "1FA573",
        "1RT745",
        "1TD179",
        "1MD042",
        "1FA006",
        "1RT705",
        // Profile: Applied Computational Engineering
        "1MA356",
        "1TD056",
        "1TD389",
        "1TD062",
        "1FA573",
        "1MA256",
        "1TD070",
        "1TD051",
        "1TD052",
      ],
      color: "#3b82f6", // blue
    },
    {
      id: "electrification",
      name: "Electrification",
      description: "Elektrifiering - Power electronics, high voltage technology, and electrical grid systems for sustainable electrification",
      requiredCourseIds: [
        "1TE765",
        "1TE766",
        "1EL021",
        "1TE754",
      ],
      electiveCourseIds: [
        "1TE737",
        "1EL204",
        "1TE038",
        "1EL843",
        "1EL009",
        "1EL019",
        "1TE039",
      ],
      color: "#ef4444", // red
    },
    {
      id: "sustainable-energy",
      name: "Sustainable Energy Technology",
      description: "Hållbar energiteknik - Renewable energy systems, solar energy, battery technology, and sustainable energy solutions",
      requiredCourseIds: [
        "1FA404",
        "1TE028",
        "1GV214",
      ],
      electiveCourseIds: [
        "1TE039",
        "1TE724",
        "1FA032",
        "1TS335",
        "1RT495",
        "1RT004",
        "1KB274",
        "1FA457",
      ],
      color: "#22c55e", // green
    },
    {
      id: "embedded-systems",
      name: "Embedded Systems",
      description: "Inbyggda system - Digital electronics, wireless systems, IoT, and embedded hardware/software. Two profiles: Embedded Hardware and Systems Engineering",
      requiredCourseIds: [
        "1TE651",
        "1TE039",
        "1RT495",
        "1TM012",
        "1FA326",
      ],
      electiveCourseIds: [
        // Profile: Embedded Hardware
        "1TE723",
        "1FA329",
        "1TE750",
        "1TE044",
        "1EL011",
        // Profile: Systems Engineering
        "1TD184",
        "1TE747",
        "1TE748",
        "1TE749",
        "1EL011",
        "1EL014",
        "1DT004",
      ],
      color: "#f59e0b", // amber
    },
    {
      id: "applied-physics",
      name: "Applied Physics",
      description: "Tillämpad fysik - Advanced physics, quantum technology, particle physics, and materials science. Two profiles: Physics and Quantum Technology",
      requiredCourseIds: [
        "1FA535",
        "1TM013",
        "1FA352",
        "1FA140",
      ],
      electiveCourseIds: [
        // Profile: Physics
        "1FA252",
        "1FA253",
        "1FA346",
        "1FA680",
        "1FA347",
        "1FA032",
        "1FA348",
        "1FA667",
        "1FA152",
        // Profile: Quantum Technology
        "1TE039",
        "1FA026",
        "1TG310",
        "1FA019",
        "1FA664",
        "1FA673",
        "1TM008",
        "1FA592",
        "1FA670",
        "1FA665",
      ],
      color: "#a855f7", // purple
    },
    {
      id: "general",
      name: "General Track",
      description: "Flexible combination of courses across different areas",
      requiredCourseIds: [],
      electiveCourseIds: [],
      color: "#6b7280", // gray
    },
  ],

  // Semesters 1-10 with all courses from the outline
  semesters: [
    // Semester 1
    {
      number: 1,
      periods: [
        {
          number: 1,
          courses: [
            createCourse(
              "1TE609",
              "Introduction to Engineering Physics",
              5,
              true,
              "Technology G1N"
            ),
            createCourse("1MA090", "Algebra and Geometry", 5, true, "Mathematics G1N"),
            createCourse(
              "1MA360",
              "Calculus in One Variable",
              5,
              true,
              "Mathematics G1F"
            ),
          ],
        },
        {
          number: 2,
          courses: [
            createCourse(
              "1MA360",
              "Calculus in One Variable (continued)",
              5,
              true,
              "Mathematics G1F"
            ),
            createCourse(
              "1TD433",
              "Computer Programming I",
              5,
              true,
              "Computer Science G1N, Technology G1N"
            ),
            createCourse(
              "1FA105",
              "Mechanics Basic Course",
              5,
              true,
              "Physics G1F, Technology G1F"
            ),
          ],
        },
      ],
    },
    // Semester 2
    {
      number: 2,
      periods: [
        {
          number: 3,
          courses: [
            createCourse(
              "1MA361",
              "Calculus in Several Variables",
              5,
              true,
              "Mathematics G1F"
            ),
            createCourse(
              "1FA105",
              "Mechanics Basic Course (continued)",
              5,
              true,
              "Physics G1F, Technology G1F"
            ),
            createCourse(
              "1TE720",
              "Electric Measurement Techniques",
              5,
              true,
              "Technology G1F"
            ),
          ],
        },
        {
          number: 4,
          courses: [
            createCourse("1TM044", "Mechanics II F", 5, true, "Physics G1F, Technology G1F"),
            createCourse(
              "1FA514",
              "Electromagnetism I",
              5,
              true,
              "Physics G1F, Technology G1F"
            ),
            createCourse(
              "1MA361",
              "Calculus in Several Variables (continued)",
              5,
              true,
              "Mathematics G1F"
            ),
          ],
        },
      ],
    },
    // Semester 3
    {
      number: 3,
      periods: [
        {
          number: 1,
          courses: [
            createCourse("1MA034", "Transform Methods", 5, true, "Mathematics G1F"),
            createCourse("1TE624", "Electronics I", 5, true, "Technology G1F"),
            createCourse("1MA024", "Linear Algebra II", 5, true, "Mathematics G1F"),
          ],
        },
        {
          number: 2,
          courses: [
            createCourse(
              "1TE626",
              "Electromagnetism II",
              5,
              true,
              "Physics G1F, Technology G1F"
            ),
            createCourse(
              "1FA527",
              "Technical Thermodynamics",
              5,
              true,
              "Physics G1F, Technology G1F"
            ),
            createCourse(
              "1FA103",
              "Mechanics III",
              5,
              false,
              "Physics G1F, Technology G1F"
            ),
          ],
        },
      ],
    },
    // Semester 4
    {
      number: 4,
      periods: [
        {
          number: 3,
          courses: [
            createCourse(
              "1TD343",
              "Introduction to Scientific Computing F",
              5,
              true,
              "Computer Science G1F, Mathematics G1F, Technology G1F"
            ),
            createCourse(
              "1FA121",
              "Mathematical Methods of Physics",
              5,
              true,
              "Mathematics G1F, Physics G1F"
            ),
            createCourse(
              "1MS029",
              "Mathematical Statistics KF",
              5,
              true,
              "Mathematics G1F"
            ),
          ],
        },
        {
          number: 4,
          courses: [
            createCourse(
              "1TD352",
              "Scientific Computing for Data Analysis",
              5,
              true,
              "Computer Science G2F, Technology G2F"
            ),
            createCourse(
              "1TE623",
              "Energy and Environmental Technology",
              5,
              true,
              "Technology G2F"
            ),
            createCourse("1FA522", "Waves and Optics", 5, true, "Physics G2F"),
          ],
        },
      ],
    },
    // Semester 5
    {
      number: 5,
      periods: [
        {
          number: 1,
          courses: [
            createCourse("1FA535", "Quantum Physics F", 10, true, "Physics G2F"),
            createCourse("1TE661", "Signals and Systems", 5, true, "Technology G2F"),
          ],
        },
        {
          number: 2,
          courses: [
            createCourse(
              "1FA103",
              "Mechanics III",
              5,
              false,
              "Physics G1F, Technology G1F"
            ),
            createCourse(
              "1RT490",
              "Automatic Control I",
              5,
              true,
              "Sociotechnical Systems G2F, Technology G2F"
            ),
            createCourse("1TM013", "Solid State Physics F", 5, true, "Physics G2F, Technology G2F"),
            createCourse(
              "1TD354",
              "Scientific Computing for Partial Differential Equations",
              5,
              true,
              "Computational Science A1N, Computer Science A1N, Technology A1N"
            ),
          ],
        },
      ],
    },
    // Semester 6
    {
      number: 6,
      periods: [
        {
          number: 3,
          courses: [
            createCourse(
              "1RT700",
              "Statistical Machine Learning",
              5,
              true,
              "Computer Science A1N, Data Science A1N, Image Analysis and Machine Learning A1N, Mathematics A1N, Technology A1N"
            ),
            createCourse(
              "1RT490",
              "Automatic Control I",
              5,
              true,
              "Sociotechnical Systems G2F, Technology G2F"
            ),
            createCourse(
              "1TM035",
              "Continuum Mechanics",
              5,
              true,
              "Physics A1N, Technology A1N"
            ),
            createCourse(
              "1TM043",
              "Computational Mechanics of Materials",
              5,
              true,
              "Physics A1N, Technology A1N"
            ),
            createCourse(
              "1EL002",
              "Applied Fluid Mechanics",
              5,
              true,
              "Physics G1F, Technology G1F"
            ),
            createCourse(
              "1TE655",
              "Power Engineering",
              5,
              false,
              "Sociotechnical Systems G2F, Technology G2F"
            ),
          ],
        },
        {
          number: 4,
          courses: [
            createCourse(
              "1TE664",
              "Independent Project in Engineering Physics",
              15,
              true,
              "Technology G2E"
            ),
          ],
        },
      ],
    },
    // Semester 7
    {
      number: 7,
      periods: [
        {
          number: 1,
          courses: [
            createCourse(
              "1TD722",
              "Computer Programming II",
              5,
              true,
              "Computer Science G1F, Technology G1F"
            ),
            createCourse(
              "1DL301",
              "Database Design I",
              5,
              false,
              "Computer Science G2F, Sociotechnical Systems G2F, Technology G2F"
            ),
            createCourse(
              "1TD452",
              "Numerical Linear Algebra",
              5,
              true,
              "Computer Science A1N, Mathematics A1N"
            ),
          ],
        },
        {
          number: 2,
          courses: [
            createCourse(
              "1TD396",
              "Computer-Assisted Image Analysis I",
              5,
              true,
              "Computer Science A1N, Technology A1N"
            ),
            createCourse(
              "1TD184",
              "Optimisation",
              5,
              true,
              "Computational Science A1N, Computer Science A1N, Data Science A1N, Technology A1N"
            ),
            createCourse(
              "1TD389",
              "Scientific Visualisation",
              5,
              false,
              "Computational Science A1N, Computer Science A1N, Technology A1N"
            ),
            createCourse(
              "1FA370",
              "Applied Deep Learning in Physics and Engineering",
              5,
              false,
              "Physics A1N, Technology A1N"
            ),
          ],
        },
      ],
    },
    // Semester 8 - Split by tracks
    {
      number: 8,
      periods: [
        {
          number: 3,
          courses: [
            // Scientific Computing track
            createCourse(
              "1TD169",
              "Data Engineering I",
              5,
              false,
              "Computational Science A1N, Computer Science A1N, Data Science A1N, Technology A1N"
            ),
            createCourse(
              "1MS926",
              "Applied Statistics",
              5,
              false,
              "Mathematics G1F, Sociotechnical Systems G1F, Technology G1F"
            ),
            createCourse(
              "1RT720",
              "Deep Learning",
              5,
              false,
              "Computer Science A1F, Data Science A1F, Image Analysis and Machine Learning A1F, Technology A1F"
            ),
            createCourse(
              "1FA573",
              "Computational Physics",
              5,
              false,
              "Computational Science A1N, Physics A1N"
            ),
            // Physics track
            createCourse(
              "1FA680",
              "Spectroscopy: Instrumentation, Theory and Applications",
              5,
              false,
              "Materials Science A1F, Physics A1F, Technology A1F"
            ),
            createCourse(
              "1FA347",
              "Elementary Particle Physics",
              5,
              false,
              "Physics A1N"
            ),
            createCourse(
              "1FA032",
              "Nuclear Reactor Physics",
              5,
              false,
              "Physics A1F"
            ),
            // Energy track
            createCourse(
              "1TE038",
              "Wind Power - Technology and Systems",
              5,
              false,
              "Renewable Electricity Production A1N, Technology A1N"
            ),
            createCourse(
              "1TS335",
              "District Heating Systems",
              5,
              false,
              "Technology A1N"
            ),
          ],
        },
        {
          number: 4,
          courses: [
            // Scientific Computing track
            createCourse(
              "1RT745",
              "Reinforcement Learning",
              5,
              false,
              "Data Science A1N, Embedded Systems A1N, Technology A1N"
            ),
            createCourse(
              "1TD179",
              "Machine Learning Theory",
              5,
              false,
              "Computer Science A1F, Data Science A1F, Mathematics A1F"
            ),
            createCourse(
              "1MD042",
              "Advanced Deep Learning for Image Processing",
              5,
              false,
              "Computer Science A1F, Image Analysis and Machine Learning A1F"
            ),
            createCourse(
              "1FA006",
              "Advanced Applied Deep Learning in Physics and Engineering",
              5,
              false,
              "Physics A1F, Technology A1F"
            ),
            // Physics track
            createCourse(
              "1FA152",
              "Dynamical System and Chaos",
              5,
              false,
              "Mathematics A1N, Physics A1N"
            ),
            createCourse(
              "1FA348",
              "Accelerators and Detectors",
              5,
              false,
              "Physics A1F, Technology A1F"
            ),
            createCourse(
              "1FA667",
              "Biomedical Imaging Techniques",
              5,
              false,
              "Physics A1F, Quantum Technology A1F, Technology A1F"
            ),
            // Energy track
            createCourse(
              "1RT495",
              "Automatic Control II",
              5,
              false,
              "Embedded Systems A1N, Technology A1N"
            ),
            createCourse(
              "1RT004",
              "Safety and Security in Control Systems",
              5,
              false,
              "Computer Science A1N, Embedded Systems A1N, Technology A1N"
            ),
          ],
        },
      ],
    },
    // Semester 9
    {
      number: 9,
      periods: [
        {
          number: 1,
          courses: [
            createCourse(
              "1TS327",
              "Industrial Project Management I",
              5,
              true,
              "Industrial Engineering and Management A1N, Technology A1N"
            ),
            // Scientific Computing
            createCourse(
              "1RT705",
              "Advanced Probabilistic Machine Learning",
              5,
              true,
              "Computer Science A1F, Data Science A1F, Mathematics A1F, Technology A1F"
            ),
            // Embedded Systems
            createCourse(
              "1TE722",
              "Open Advanced Course in Embedded Systems",
              5,
              false,
              "Technology A1F"
            ),
            createCourse(
              "1RT885",
              "System Identification",
              5,
              false,
              "Technology A1F"
            ),
            // Physics
            createCourse(
              "1FA257",
              "Classical Electrodynamics",
              10,
              false,
              "Physics A1F"
            ),
            // Energy
            createCourse(
              "1KB274",
              "Batteries and Storage",
              5,
              false,
              "Energy Technology A1N, Renewable Electricity Production A1N, Technology A1N"
            ),
            createCourse(
              "1FA457",
              "Life Cycle Analysis for Energy and Materials",
              5,
              true,
              "Physics A1N, Technology A1N"
            ),
          ],
        },
        {
          number: 2,
          courses: [
            // Scientific Computing
            createCourse(
              "1TD316",
              "Project in Scientific Computing",
              15,
              true,
              "Computer Science A1F, Technology A1F"
            ),
            // Embedded Systems
            createCourse(
              "1TE721",
              "Project in Embedded Systems",
              15,
              true,
              "Technology A1F"
            ),
            // Physics
            createCourse(
              "1FA495",
              "Project Course in Applied Physics",
              15,
              true,
              "Technology A1F"
            ),
            // Energy
            createCourse(
              "1GV350",
              "Project in Sustainable Energy Technology",
              15,
              true,
              "Technology A1F"
            ),
            // Electrification
            createCourse(
              "1EL996",
              "Project in Electrification",
              15,
              true,
              "Technology A1F"
            ),
          ],
        },
      ],
    },
    // Semester 10
    {
      number: 10,
      periods: [
        {
          number: 1,
          courses: [
            createCourse(
              "1TE864",
              "Degree Project in Engineering Physics",
              30,
              true,
              "Technology A2E"
            ),
          ],
        },
        {
          number: 2,
          courses: [],
        },
      ],
    },
  ],
};

// All available programs
export const programs: Program[] = [engineeringPhysicsProgram];

// Helper functions
export async function getProgramById(id: string): Promise<Program | undefined> {
  return programs.find((p) => p.id === id);
}

export async function getAllPrograms(): Promise<Program[]> {
  return programs;
}

export async function getProgramCourseById(
  program: Program,
  courseId: string
): Promise<ProgramCourse | undefined> {
  for (const semester of program.semesters) {
    for (const period of semester.periods) {
      const course = period.courses.find((c) => c.courseId === courseId || c.code === courseId);
      if (course) return course;
    }
  }
  return undefined;
}

// Deprecated: Use getProgramCourseById instead
export async function getProgramCourseByCode(
  program: Program,
  code: string
): Promise<ProgramCourse | undefined> {
  return getProgramCourseById(program, code);
}

export async function getAllCoursesInProgram(program: Program): Promise<ProgramCourse[]> {
  const seenCodes = new Set<string>();
  const courses: ProgramCourse[] = [];
  for (const semester of program.semesters) {
    for (const period of semester.periods) {
      for (const course of period.courses) {
        if (!seenCodes.has(course.code)) {
          seenCodes.add(course.code);
          courses.push(course);
        }
      }
    }
  }
  return courses;
}

/**
 * Resolve program courses to their Firestore IDs.
 * Returns a map of course code -> CourseMapping with courseId (Firestore ID).
 */
export async function resolveProgramCourseIds(programCourses: ProgramCourse[]): Promise<Map<string, CourseMapping>> {
  // Get all Firestore courses (lightweight - just id, code, title)
  const allCourses = await fetchCourses();
  const courseSummaries = allCourses.map(c => ({
    id: c.id,
    code: c.code,
    title: c.title,
  }));
  
  // Match program courses to Firestore courses
  const programCodes = programCourses.map(c => ({ code: c.code, title: c.title }));
  const mappings = await matchMultipleProgramCourses(programCodes, courseSummaries);
  
  return mappings;
}

/**
 * Get all program courses enriched with their Firestore IDs.
 * Returns courses that have courseId populated where found.
 */
export async function getAllCoursesInProgramWithIds(program: Program): Promise<ProgramCourse[]> {
  const courses = await getAllCoursesInProgram(program);
  const mappings = await resolveProgramCourseIds(courses);
  
  // Enrich courses with IDs
  return courses.map(course => {
    const mapping = mappings.get(course.code);
    if (mapping?.courseId) {
      return { ...course, courseId: mapping.courseId };
    }
    return course;
  });
}

interface CourseWithPrereqs {
  id: string;
  code: string;
  title: string;
  credits?: number;
  isMandatory: boolean;
  prerequisites?: string[] | null;
}

/**
 * Get program courses with their full prerequisite data.
 * Fetches courses by their resolved Firestore IDs.
 */
export async function getProgramCoursesWithPrereqs(program: Program): Promise<{
  courses: CourseWithPrereqs[];
  courseIds: Set<string>;
  codeToId: Map<string, string>;
}> {
  // Get program courses with their IDs
  const programCourses = await getAllCoursesInProgramWithIds(program);
  
  // Filter to only courses that have Firestore IDs
  const coursesWithIds = programCourses.filter((c): c is ProgramCourse & { courseId: string } => 
    !!c.courseId
  );
  
  if (coursesWithIds.length === 0) {
    return { courses: [], courseIds: new Set(), codeToId: new Map() };
  }
  
  // Fetch full course data by IDs
  const courseIds = coursesWithIds.map(c => c.courseId);
  const { byId: coursesById } = await fetchCoursesByIds(courseIds);
  
  // Build result
  const result: CourseWithPrereqs[] = [];
  const courseIdSet = new Set<string>();
  const codeToId = new Map<string, string>();
  
  for (const pc of coursesWithIds) {
    const fullCourse = coursesById.get(pc.courseId);
    if (fullCourse) {
      result.push({
        id: fullCourse.id,
        code: pc.code,
        title: fullCourse.title || pc.title,
        credits: pc.credits,
        isMandatory: pc.isMandatory,
        prerequisites: fullCourse.prerequisites,
      });
      courseIdSet.add(fullCourse.id);
      codeToId.set(pc.code.trim().toUpperCase(), fullCourse.id);
    }
  }
  
  return { courses: result, courseIds: courseIdSet, codeToId };
}
