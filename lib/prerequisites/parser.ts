/**
 * AI-assisted parser for converting free-text entry_requirements
 * into a StructuredRequirement tree.
 *
 * Uses the existing OpenRouter integration to send the text to an LLM
 * with a structured JSON prompt.
 */

import { generateStructured } from '@/lib/ai/openrouter';
import type { StructuredRequirement } from '@/lib/courses';

const PARSE_SYSTEM_PROMPT = `You are a university course requirements parser. Convert free-text entry requirements into a structured JSON format.

The output must be a JSON object representing a requirement tree. Each node has a "type" field. The possible types are:

- "AND": All children must be satisfied. Has "children" array.
- "OR": At least one child must be satisfied. Has "children" array.
- "COURSE": A specific prerequisite course. Has "courseCode" (string), "courseTitle" (string), "courseId" (string, use empty string if unknown).
- "CREDITS": Minimum total credits. Has "minCredits" (number).
- "DOMAIN_CREDITS": Minimum credits in a domain. Has "domain" (string), "minCredits" (number).
- "TOPIC": A specific topic that must be covered. Has "topic" (string).
- "LANGUAGE": Language proficiency requirement. Has "language" (string), "level" (string, e.g. "B2", "C1").
- "CUSTOM": Any requirement that doesn't fit the above. Has "text" (string).

Each node can optionally have a "label" (string) for human-readable description.

Rules:
- If there are multiple requirements that ALL must be met, wrap them in an AND node.
- If there are alternative options (e.g., "Course A or Course B"), wrap them in an OR node.
- Extract course codes when present (e.g., "1MA103", "2FE032").
- Extract credit requirements (e.g., "120 credits", "45 credits in mathematics").
- Extract language requirements (e.g., "English B2", "Swedish B1").
- For anything that doesn't fit the structured types, use CUSTOM.
- Always return valid JSON.

Example input: "120 credits including 45 credits in Mathematics. Either 1DL201 or 1TD722 required. English B2."
Example output:
{
  "type": "AND",
  "label": "All requirements",
  "children": [
    { "type": "CREDITS", "minCredits": 120, "label": "120 credits total" },
    { "type": "DOMAIN_CREDITS", "domain": "Mathematics", "minCredits": 45, "label": "45 credits in Mathematics" },
    {
      "type": "OR",
      "label": "Programming prerequisite",
      "children": [
        { "type": "COURSE", "courseCode": "1DL201", "courseTitle": "Program Design and Data Structures", "courseId": "" },
        { "type": "COURSE", "courseCode": "1TD722", "courseTitle": "Scientific Computing with Python", "courseId": "" }
      ]
    },
    { "type": "LANGUAGE", "language": "English", "level": "B2", "label": "English B2" }
  ]
}`;

export interface ParseRequirementsOptions {
    model?: string;
    maxTokens?: number;
}

/**
 * Parse free-text entry requirements into a structured requirement tree.
 *
 * @param text - The free-text entry_requirements string from the course
 * @param knownCourses - Optional list of known course codes/titles for reference
 * @param options - Optional model/token configuration
 * @returns The parsed StructuredRequirement tree
 */
export async function parseRequirements(
    text: string,
    knownCourses?: { code: string; title: string; id: string }[],
    options: ParseRequirementsOptions = {}
): Promise<StructuredRequirement> {
    if (!text || text.trim().length === 0) {
        return {
            type: 'CUSTOM',
            text: 'No entry requirements specified',
            label: 'No requirements',
        };
    }

    const { model = 'mistralai/mistral-nemo', maxTokens = 2048 } = options;

    let userPrompt = `Parse the following entry requirements into structured JSON:\n\n"${text}"`;

    if (knownCourses && knownCourses.length > 0) {
        // Provide some course codes for reference (limit to avoid token overflow)
        const courseRef = knownCourses
            .slice(0, 100)
            .map(c => `${c.code}: ${c.title}`)
            .join('\n');
        userPrompt += `\n\nKnown course codes for reference:\n${courseRef}`;
    }

    userPrompt += '\n\nReturn only the JSON object, no markdown fences.';

    try {
        const response = await generateStructured(
            [
                { role: 'system', content: PARSE_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            { model, maxTokens }
        );

        const parsed = response.data as StructuredRequirement;

        // Basic validation
        if (!parsed || !parsed.type) {
            return {
                type: 'CUSTOM',
                text,
                label: 'Could not parse requirements',
            };
        }

        return parsed;
    } catch (error) {
        console.error('Failed to parse requirements:', error);
        return {
            type: 'CUSTOM',
            text,
            label: 'Parse error - manual review needed',
        };
    }
}
