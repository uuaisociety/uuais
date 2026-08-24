import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import type { PublicSeed } from '@/lib/server-data';
import type { TeamCategory } from '@/types';
import {
  analyzeCourse,
  getBlogPostById,
  getCourseById,
  getCourses,
  getEngagementStats,
  getPublishedBlogPosts,
  getPublicSeedForMcp,
  getSiteStats,
  searchSiteContent,
} from '@/lib/mcp/uuais-data';

/**
 * Read-only MCP server exposing UUAIS site data (events, FAQs, team, jobs,
 * board positions, application campaigns) sourced from Firestore.
 *
 * Scoped securely: every tool is read-only (`readOnlyHint`), there is no agent,
 * no write access, and no filesystem/network access beyond the Firestore reads
 * in `getPublicSeed()`. The route handler adds bearer-token auth on top.
 */

const READ_ONLY_ANNOTATIONS = { readOnlyHint: true, destructiveHint: false };

function jsonText(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
}

/**
 * Fetch the MCP-safe seed (published content only, PII stripped) and build the
 * tool result. On a data-source failure returns `{ available: false }` so the
 * agent can report the data as unavailable instead of hallucinating empty data.
 */
async function withSeed<T>(build: (seed: PublicSeed) => T) {
  try {
    const seed = await getPublicSeedForMcp();
    return jsonText(build(seed));
  } catch (error) {
    console.error('[mcp] getPublicSeedForMcp failed:', error);
    return jsonText({ available: false });
  }
}

/** Board positions + open campaigns are admin-facing data, fetched directly (not via the public SSR seed). */
async function getPositionsAndCampaigns() {
  const { adminDb } = await import('@/lib/firebase-admin');
  const [positionsSnap, campaignsSnap] = await Promise.all([
    adminDb.collection('board-positions').orderBy('order', 'asc').get(),
    adminDb.collection('applicationCampaigns').where('status', '==', 'open').get(),
  ]);
  return {
    positions: positionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    campaigns: campaignsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export function createUuaisMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'uuais-admin', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'getUuaisEvents',
    {
      description:
        'Get UUAIS events from the society website (published events, newest first). ' +
        'Use for questions about upcoming events, past events, event details, dates, locations, or registration.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of events to return (default 10)'),
        upcomingOnly: z
          .boolean()
          .default(false)
          .describe('If true, return only events that have not started yet'),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ limit, upcomingOnly }) =>
      withSeed((seed) => {
        let events = seed.events;
        if (upcomingOnly) {
          const now = new Date().toISOString();
          events = events.filter((e) => e.eventStartAt >= now);
        }
        return { events: events.slice(0, limit) };
      }),
  );

  server.registerTool(
    'getUuaisFaqs',
    {
      description:
        'Get the FAQ list from the UUAIS website. Use for questions about how the society works, ' +
        'membership, joining, events, or any question a member might have that has a canonical answer.',
      inputSchema: z.object({
        category: z
          .string()
          .optional()
          .describe("Optional FAQ category to filter by (e.g. 'general', 'membership')"),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ category }) =>
      withSeed((seed) => {
        const faqs = category ? seed.faqs.filter((f) => f.category === category) : seed.faqs;
        return { faqs };
      }),
  );

  server.registerTool(
    'getUuaisTeam',
    {
      description:
        'Get the UUAIS team and board members from the website. Use for questions about who is in ' +
        'the society, the board, teams (development, IT, growth, partnerships & events, founders), ' +
        'and member contact info.',
      inputSchema: z.object({
        category: z
          .string()
          .optional()
          .describe(
            'Optional team category to filter by: board, development, it, growth, partnerships_events, founders, alumni',
          ),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ category }) =>
      withSeed((seed) => {
        const team = category
          ? seed.teamMembers.filter((m) => m.teams?.includes(category as TeamCategory))
          : seed.teamMembers;
        return { team };
      }),
  );

  server.registerTool(
    'getUuaisJobs',
    {
      description:
        'Get job, internship, and thesis opportunities posted on the UUAIS website. ' +
        'Use for questions about open positions, career opportunities, or companies recruiting.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20).describe('Maximum number of jobs to return (default 20)'),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ limit }) =>
      withSeed((seed) => ({ jobs: seed.jobs.slice(0, limit) })),
  );

  server.registerTool(
    'getUuaisBoard',
    {
      description:
        'Get current open board positions and application campaigns from the UUAIS website. ' +
        'Use for questions about joining the board or applying to a team role.',
      inputSchema: z.object({}),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      try {
        const { positions, campaigns } = await getPositionsAndCampaigns();
        return jsonText({ positions, campaigns });
      } catch (error) {
        console.error('[mcp] getPositionsAndCampaigns failed:', error);
        return jsonText({ available: false });
      }
    },
  );

  server.registerTool(
    'getUuaisOverview',
    {
      description:
        'Get a compact overview of everything on the UUAIS website: upcoming events, ' +
        'open board positions and campaigns, open jobs, and FAQ/team counts. ' +
        'Use as a first stop when a question is broad or you are unsure which tool to call.',
      inputSchema: z.object({
        eventLimit: z.number().int().min(1).max(10).default(5).describe('Maximum upcoming events to include'),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ eventLimit }) => {
      try {
        const [seed, { positions, campaigns }] = await Promise.all([getPublicSeedForMcp(), getPositionsAndCampaigns()]);
        const now = new Date().toISOString();
        return jsonText({
          overview: {
            available: true,
            upcomingEvents: seed.events.filter((e) => e.eventStartAt >= now).slice(0, eventLimit),
            boardPositions: positions,
            openCampaigns: campaigns,
            openJobs: seed.jobs.length,
            faqCount: seed.faqs.length,
            teamCount: seed.teamMembers.length,
          },
        });
      } catch (error) {
        console.error('[mcp] getUuaisOverview failed:', error);
        return jsonText({ available: false });
      }
    },
  );

  server.registerTool(
    'getUuaisBlogPosts',
    {
      description:
        'Get published blog posts from the UUAIS website (newest first). ' +
        'Use for news, articles, announcements, project write-ups, and anything the society has published.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(25).default(5).describe('Maximum number of posts to return (default 5)'),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ limit }) => {
      const posts = await getPublishedBlogPosts(limit);
      if (posts === null) return jsonText({ available: false });
      return jsonText({ posts });
    },
  );

  server.registerTool(
    'getUuaisBlogPostById',
    {
      description:
        'Get a single published blog post from the UUAIS website by its id, including full content. ' +
        'Use after getUuaisBlogPosts to read a specific article in full.',
      inputSchema: z.object({
        id: z.string().describe('The blog post id (from getUuaisBlogPosts)'),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id }) => {
      const result = await getBlogPostById(id);
      if (result.status === 'unavailable') return jsonText({ available: false });
      return jsonText({ post: result.item });
    },
  );

  server.registerTool(
    'getUuaisCourses',
    {
      description:
        'Search the UUAIS Uppsala course directory. Returns courses with code, title, level, credits, ' +
        'description, tags, language, and more. Use for questions about specific courses, study planning, ' +
        'machine-learning/AI courses, prerequisites, or levels.',
      inputSchema: z.object({
        search: z.string().optional().describe('Free-text search over title, code, description, and tags'),
        level: z
          .string()
          .optional()
          .describe("Filter by level: 'Preparatory', \"Bachelor's\", or \"Master's\""),
        limit: z.number().int().min(1).max(25).default(10).describe('Maximum number of courses to return (default 10)'),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ search, level, limit }) => {
      const courses = await getCourses();
      if (courses === null) return jsonText({ available: false });
      const term = (search ?? '').trim().toLowerCase();
      let filtered = courses;
      if (term) {
        filtered = filtered.filter((c) =>
          [c.title, c.code, c.description, (c.tags ?? []).join(' ')].join(' ').toLowerCase().includes(term),
        );
      }
      if (level) {
        filtered = filtered.filter((c) => c.level === level);
      }
      const compact = filtered.slice(0, limit).map((c) => ({
        id: c.id,
        code: c.code || c.id,
        title: c.title,
        level: c.level ?? null,
        credits: c.credits ?? null,
        description: c.description,
        tags: c.tags ?? [],
      }));
      return jsonText({ courses: compact, total: filtered.length });
    },
  );

  server.registerTool(
    'getUuaisCourseById',
    {
      description:
        'Get the full details of a single course from the UUAIS course directory by id: code, title, level, ' +
        'credits, description, learning outcomes, study period, language, pace, location, syllabus link, ' +
        'prerequisites, and related courses.',
      inputSchema: z.object({
        id: z.string().describe('The course id (from getUuaisCourses)'),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id }) => {
      const result = await getCourseById(id);
      if (result.status === 'unavailable') return jsonText({ available: false });
      return jsonText({ course: result.item });
    },
  );

  server.registerTool(
    'getUuaisCourseAnalysis',
    {
      description:
        'Analyze a course in the UUAIS course directory: its level, credits, study period, language, ' +
        'pace, location, tags, and the courses it depends on (prerequisites), courses that require it ' +
        '(required by), and related courses. Use for study-planning and prerequisite-chain questions.',
      inputSchema: z.object({
        courseId: z.string().describe('The course id (from getUuaisCourses)'),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ courseId }) => {
      const analysis = await analyzeCourse(courseId);
      if (!analysis.available) return jsonText({ available: false });
      return jsonText({ analysis: analysis.analysis });
    },
  );

  server.registerTool(
    'getUuaisAnalytics',
    {
      description:
        'Get engagement analytics for the UUAIS website: the most-clicked events and jobs and the ' +
        'most-read blog posts. Use for questions like "which event is most popular" or what content ' +
        'gets the most attention.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(10).default(5).describe('Maximum items per category to return (default 5)'),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ limit }) => {
      const stats = await getEngagementStats(limit);
      if (stats === null) return jsonText({ available: false });
      return jsonText(stats);
    },
  );

  server.registerTool(
    'searchUuaisContent',
    {
      description:
        'Search across everything on the UUAIS website at once: events, blog posts, FAQs, jobs, ' +
        'team members, and courses. Returns grouped hits with type, title, and a short snippet. ' +
        'Use when you are not sure which tool to call or the answer could be in several places.',
      inputSchema: z.object({
        query: z.string().min(1).max(200).describe('Search terms to look for across all site content'),
        limit: z.number().int().min(1).max(25).default(10).describe('Maximum number of hits to return (default 10)'),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query, limit }) => {
      const result = await searchSiteContent(query, limit);
      if (result === null) return jsonText({ available: false });
      return jsonText(result);
    },
  );

  server.registerTool(
    'getUuaisSiteStats',
    {
      description:
        'Get overall statistics about the UUAIS website: counts of events, upcoming events, jobs, FAQs, ' +
        'team members, board positions, open application campaigns, blog posts, and courses. ' +
        'Use for questions about the size/scale of the society\'s activities.',
      inputSchema: z.object({}),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      return jsonText(await getSiteStats());
    },
  );

  return server;
}

/**
 * Stateless handler for one MCP request (serverless pattern from the Mastra docs):
 * a fresh server + stateless transport per request, JSON responses only.
 * No session state is kept between requests.
 */
export async function handleMcpRequest(request: Request): Promise<Response> {
  const server = createUuaisMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
