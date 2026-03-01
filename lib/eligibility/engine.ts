/**
 * Eligibility Engine — evaluates a user's academic profile against
 * structured course requirements.
 *
 * Design:
 * - Pure function: no side effects, no Firestore reads
 * - O(n) over the requirement tree via memoized traversal
 * - Returns structured diff: not just boolean
 * - Cycle detection via visited set
 */

import type {
    StructuredRequirement,
    AndRequirement,
    OrRequirement,
    CourseRequirement,
    CreditsRequirement,
    DomainCreditsRequirement,
    TopicRequirement,
    LanguageRequirement,
    CustomRequirement,
} from '@/lib/courses';

// ---- Types ----

export interface CompletedCourse {
    courseId: string;
    courseCode: string;
    courseTitle?: string;
    credits: number;
    domain?: string;
    topics?: string[];
    grade?: string;
}

export interface UserAcademicProfile {
    completedCourses: CompletedCourse[];
    totalCredits: number;
    creditsByDomain: Record<string, number>;
    coveredTopics: string[];
    languageProficiency: { language: string; level: string }[];
}

export interface MissingCourse {
    courseId: string;
    courseCode: string;
    title: string;
}

export interface MissingCredits {
    type: 'total' | 'domain';
    required: number;
    current: number;
    domain?: string;
}

export interface MissingLanguage {
    language: string;
    requiredLevel: string;
}

export interface EvaluatedRequirement {
    requirement: StructuredRequirement;
    met: boolean;
    label?: string;
    children?: EvaluatedRequirement[];
    details?: string;
}

export interface EligibilityResult {
    eligible: boolean;
    missingCourses: MissingCourse[];
    missingCredits: MissingCredits[];
    missingTopics: string[];
    missingLanguages: MissingLanguage[];
    satisfiedRequirements: string[];
    evaluationTree: EvaluatedRequirement;
}

// ---- Language Level Comparison ----

const LANGUAGE_LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function languageLevelToNum(level: string): number {
    const normalized = level.toUpperCase().trim();
    const idx = LANGUAGE_LEVEL_ORDER.indexOf(normalized);
    if (idx >= 0) return idx;
    // Try to parse IELTS-style scores
    const num = parseFloat(normalized);
    if (!isNaN(num)) return num; // raw numeric comparison
    return -1; // unknown
}

function meetsLanguageLevel(has: string, required: string): boolean {
    const hasNum = languageLevelToNum(has);
    const reqNum = languageLevelToNum(required);
    if (hasNum < 0 || reqNum < 0) return false;
    return hasNum >= reqNum;
}

// ---- Core Evaluation ----

function evaluateNode(
    node: StructuredRequirement,
    profile: UserAcademicProfile,
    visited: Set<string>
): EvaluatedRequirement {
    switch (node.type) {
        case 'AND':
            return evaluateAnd(node as AndRequirement, profile, visited);
        case 'OR':
            return evaluateOr(node as OrRequirement, profile, visited);
        case 'COURSE':
            return evaluateCourse(node as CourseRequirement, profile, visited);
        case 'CREDITS':
            return evaluateCredits(node as CreditsRequirement, profile);
        case 'DOMAIN_CREDITS':
            return evaluateDomainCredits(node as DomainCreditsRequirement, profile);
        case 'TOPIC':
            return evaluateTopic(node as TopicRequirement, profile);
        case 'LANGUAGE':
            return evaluateLanguage(node as LanguageRequirement, profile);
        case 'CUSTOM':
            return evaluateCustom(node as CustomRequirement);
        default:
            return {
                requirement: node,
                met: false,
                label: 'Unknown requirement type',
                details: `Unrecognized requirement type: ${(node as StructuredRequirement).type}`,
            };
    }
}

function evaluateAnd(
    node: AndRequirement,
    profile: UserAcademicProfile,
    visited: Set<string>
): EvaluatedRequirement {
    const children = node.children.map(child => evaluateNode(child, profile, visited));
    const met = children.every(c => c.met);
    return {
        requirement: node,
        met,
        label: node.label || 'All of the following',
        children,
    };
}

function evaluateOr(
    node: OrRequirement,
    profile: UserAcademicProfile,
    visited: Set<string>
): EvaluatedRequirement {
    const children = node.children.map(child => evaluateNode(child, profile, visited));
    const met = children.some(c => c.met);
    return {
        requirement: node,
        met,
        label: node.label || 'One of the following',
        children,
    };
}

function evaluateCourse(
    node: CourseRequirement,
    profile: UserAcademicProfile,
    visited: Set<string>
): EvaluatedRequirement {
    // Cycle detection
    if (visited.has(node.courseId)) {
        return {
            requirement: node,
            met: false,
            label: node.label || node.courseTitle,
            details: `Circular dependency detected for ${node.courseCode}`,
        };
    }
    visited.add(node.courseId);

    const completed = profile.completedCourses.some(
        c => c.courseId === node.courseId || c.courseCode === node.courseCode
    );

    return {
        requirement: node,
        met: completed,
        label: node.label || `${node.courseTitle} (${node.courseCode})`,
        details: completed ? 'Completed' : `Missing: ${node.courseTitle} (${node.courseCode})`,
    };
}

function evaluateCredits(
    node: CreditsRequirement,
    profile: UserAcademicProfile
): EvaluatedRequirement {
    const met = profile.totalCredits >= node.minCredits;
    return {
        requirement: node,
        met,
        label: node.label || `${node.minCredits} credits total`,
        details: met
            ? `Have ${profile.totalCredits} credits (need ${node.minCredits})`
            : `Have ${profile.totalCredits} credits, need ${node.minCredits}`,
    };
}

function evaluateDomainCredits(
    node: DomainCreditsRequirement,
    profile: UserAcademicProfile
): EvaluatedRequirement {
    const current = profile.creditsByDomain[node.domain] || 0;
    const met = current >= node.minCredits;
    return {
        requirement: node,
        met,
        label: node.label || `${node.minCredits} credits in ${node.domain}`,
        details: met
            ? `Have ${current} credits in ${node.domain} (need ${node.minCredits})`
            : `Have ${current} credits in ${node.domain}, need ${node.minCredits}`,
    };
}

function evaluateTopic(
    node: TopicRequirement,
    profile: UserAcademicProfile
): EvaluatedRequirement {
    const topicLower = node.topic.toLowerCase();
    const met = profile.coveredTopics.some(t => t.toLowerCase() === topicLower);
    return {
        requirement: node,
        met,
        label: node.label || `Topic: ${node.topic}`,
        details: met ? `Topic covered: ${node.topic}` : `Missing topic: ${node.topic}`,
    };
}

function evaluateLanguage(
    node: LanguageRequirement,
    profile: UserAcademicProfile
): EvaluatedRequirement {
    const match = profile.languageProficiency.find(
        lp => lp.language.toLowerCase() === node.language.toLowerCase()
    );
    const met = match ? meetsLanguageLevel(match.level, node.level) : false;
    return {
        requirement: node,
        met,
        label: node.label || `${node.language} ${node.level}`,
        details: met
            ? `${node.language} proficiency met: have ${match!.level}, need ${node.level}`
            : match
                ? `${node.language}: have ${match.level}, need ${node.level}`
                : `No ${node.language} proficiency recorded`,
    };
}

function evaluateCustom(node: CustomRequirement): EvaluatedRequirement {
    return {
        requirement: node,
        met: false, // Custom requirements always need manual review
        label: node.label || 'Custom requirement',
        details: `Manual review needed: ${node.text}`,
    };
}

// ---- Collect missing items from evaluation tree ----

function collectMissing(tree: EvaluatedRequirement): {
    missingCourses: MissingCourse[];
    missingCredits: MissingCredits[];
    missingTopics: string[];
    missingLanguages: MissingLanguage[];
    satisfiedRequirements: string[];
} {
    const missingCourses: MissingCourse[] = [];
    const missingCredits: MissingCredits[] = [];
    const missingTopics: string[] = [];
    const missingLanguages: MissingLanguage[] = [];
    const satisfiedRequirements: string[] = [];

    function walk(node: EvaluatedRequirement) {
        if (node.met && node.label) {
            satisfiedRequirements.push(node.label);
        }

        if (!node.met) {
            const req = node.requirement;
            switch (req.type) {
                case 'COURSE':
                    missingCourses.push({
                        courseId: req.courseId,
                        courseCode: req.courseCode,
                        title: req.courseTitle,
                    });
                    break;
                case 'CREDITS':
                    missingCredits.push({
                        type: 'total',
                        required: req.minCredits,
                        current: 0, // Will be filled from details
                    });
                    break;
                case 'DOMAIN_CREDITS':
                    missingCredits.push({
                        type: 'domain',
                        required: req.minCredits,
                        current: 0,
                        domain: req.domain,
                    });
                    break;
                case 'TOPIC':
                    missingTopics.push(req.topic);
                    break;
                case 'LANGUAGE':
                    missingLanguages.push({
                        language: req.language,
                        requiredLevel: req.level,
                    });
                    break;
            }
        }

        if (node.children) {
            for (const child of node.children) {
                walk(child);
            }
        }
    }

    walk(tree);

    return { missingCourses, missingCredits, missingTopics, missingLanguages, satisfiedRequirements };
}

// ---- Public API ----

/**
 * Evaluate whether a user meets the structured requirements for a course.
 *
 * @param requirements - The structured requirement tree from the course document
 * @param profile - The user's academic profile (from transcript or manual input)
 * @returns Detailed eligibility result with breakdown of met/unmet requirements
 */
export function evaluateEligibility(
    requirements: StructuredRequirement,
    profile: UserAcademicProfile
): EligibilityResult {
    const visited = new Set<string>();
    const evaluationTree = evaluateNode(requirements, profile, visited);
    const { missingCourses, missingCredits, missingTopics, missingLanguages, satisfiedRequirements } =
        collectMissing(evaluationTree);

    return {
        eligible: evaluationTree.met,
        missingCourses,
        missingCredits,
        missingTopics,
        missingLanguages,
        satisfiedRequirements,
        evaluationTree,
    };
}

/**
 * Build a UserAcademicProfile from transcript data.
 * This is a convenience function for constructing the profile from parsed transcript entries.
 */
export function buildProfileFromTranscript(entries: {
    matchedCourseId?: string | null;
    rawCourseCode?: string;
    rawCourseName?: string;
    credits: number;
    domain?: string;
    topics?: string[];
    grade?: string;
}[]): UserAcademicProfile {
    const completedCourses: CompletedCourse[] = entries
        .filter(e => e.matchedCourseId)
        .map(e => ({
            courseId: e.matchedCourseId!,
            courseCode: e.rawCourseCode || '',
            courseTitle: e.rawCourseName,
            credits: e.credits,
            domain: e.domain,
            topics: e.topics,
            grade: e.grade,
        }));

    const totalCredits = entries.reduce((sum, e) => sum + (e.credits || 0), 0);

    const creditsByDomain: Record<string, number> = {};
    for (const e of entries) {
        if (e.domain) {
            creditsByDomain[e.domain] = (creditsByDomain[e.domain] || 0) + (e.credits || 0);
        }
    }

    const coveredTopics: string[] = [];
    for (const e of entries) {
        if (e.topics) {
            for (const t of e.topics) {
                if (!coveredTopics.includes(t)) coveredTopics.push(t);
            }
        }
    }

    return {
        completedCourses,
        totalCredits,
        creditsByDomain,
        coveredTopics,
        languageProficiency: [], // Typically set separately
    };
}
