/**
 * Which courses to emphasise when one is hovered: with ~300 edges on screen, keeping only the
 * ancestors and descendants lit answers "what do I need first?" and "what does this unlock?".
 */

import type { ProgramEdge } from '@/lib/programs';

export type Highlight = {
  focus: string;
  /** The focus, everything it depends on, and everything depending on it. */
  related: Set<string>;
  /** Edges on a path to or from the focus. */
  edges: Set<string>;
};

export function edgeKey(edge: Pick<ProgramEdge, 'from' | 'to'>): string {
  return `${edge.from}->${edge.to}`;
}

/**
 * Walks prerequisites backwards and dependents forwards from `focus`, transitively — a second
 * year course usually rests on a first-year one through an intermediate.
 */
export function computeHighlight(focus: string, edges: ProgramEdge[]): Highlight {
  const outgoing = new Map<string, ProgramEdge[]>();
  const incoming = new Map<string, ProgramEdge[]>();
  for (const edge of edges) {
    const out = outgoing.get(edge.from);
    if (out) out.push(edge);
    else outgoing.set(edge.from, [edge]);

    const inc = incoming.get(edge.to);
    if (inc) inc.push(edge);
    else incoming.set(edge.to, [edge]);
  }

  const related = new Set<string>([focus]);
  const edgeIds = new Set<string>();

  const walk = (start: string, direction: 'up' | 'down') => {
    const adjacency = direction === 'up' ? incoming : outgoing;
    const queue = [start];
    const seen = new Set<string>([start]);

    while (queue.length > 0) {
      const current = queue.pop() as string;
      for (const edge of adjacency.get(current) ?? []) {
        // An exclusive pair is a constraint, not a path, so it lights up but is not walked.
        edgeIds.add(edgeKey(edge));
        const next = direction === 'up' ? edge.from : edge.to;
        related.add(next);
        if (edge.type === 'EXCLUSIVE' || seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
  };

  walk(focus, 'up');
  walk(focus, 'down');

  return { focus, related, edges: edgeIds };
}
