import { computeHighlight, edgeKey } from '@/lib/programs/highlight';
import type { ProgramEdge, ProgramEdgeType } from '@/lib/programs';

const edge = (from: string, to: string, type: ProgramEdgeType = 'HARD'): ProgramEdge => ({
  from,
  to,
  type,
  source: 'llm',
});

describe('computeHighlight', () => {
  // A -> B -> C, plus an unrelated pair X -> Y.
  const chain = [edge('A', 'B'), edge('B', 'C'), edge('X', 'Y')];

  it('always includes the focused course', () => {
    expect(computeHighlight('B', chain).related.has('B')).toBe(true);
  });

  it('includes direct prerequisites and dependents', () => {
    const { related } = computeHighlight('B', chain);
    expect(related.has('A')).toBe(true);
    expect(related.has('C')).toBe(true);
  });

  it('follows the chain transitively in both directions', () => {
    expect(computeHighlight('C', chain).related.has('A')).toBe(true);
    expect(computeHighlight('A', chain).related.has('C')).toBe(true);
  });

  it('excludes unrelated courses', () => {
    const { related } = computeHighlight('B', chain);
    expect(related.has('X')).toBe(false);
    expect(related.has('Y')).toBe(false);
  });

  it('collects the edges along the path', () => {
    const { edges } = computeHighlight('C', chain);
    expect(edges.has(edgeKey({ from: 'A', to: 'B' }))).toBe(true);
    expect(edges.has(edgeKey({ from: 'B', to: 'C' }))).toBe(true);
    expect(edges.has(edgeKey({ from: 'X', to: 'Y' }))).toBe(false);
  });

  it('lights an exclusive partner without traversing through it', () => {
    // B excludes E, and E has its own prerequisite P that is not part of B's story.
    const edges = [edge('B', 'E', 'EXCLUSIVE'), edge('P', 'E')];
    const { related } = computeHighlight('B', edges);
    expect(related.has('E')).toBe(true);
    expect(related.has('P')).toBe(false);
  });

  it('handles a course with no connections', () => {
    const { related, edges } = computeHighlight('LONE', chain);
    expect([...related]).toEqual(['LONE']);
    expect(edges.size).toBe(0);
  });

  it('terminates on a cycle in machine-extracted data', () => {
    const cyclic = [edge('A', 'B'), edge('B', 'A')];
    const { related } = computeHighlight('A', cyclic);
    expect(related).toEqual(new Set(['A', 'B']));
  });

  it('follows a diamond without duplicating work', () => {
    const diamond = [edge('R', 'L'), edge('R', 'M'), edge('L', 'T'), edge('M', 'T')];
    expect(computeHighlight('T', diamond).related).toEqual(new Set(['T', 'L', 'M', 'R']));
  });
});
