import { loadManualPassed, saveManualPassed } from '@/lib/programs/manual';

describe('manual completion marks', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts empty', () => {
    expect(loadManualPassed('TTF2Y').size).toBe(0);
  });

  it('round-trips a set of codes', () => {
    saveManualPassed('TTF2Y', new Set(['1MA090', '1TE609']));
    expect([...loadManualPassed('TTF2Y')].sort()).toEqual(['1MA090', '1TE609']);
  });

  it('keeps programmes separate', () => {
    saveManualPassed('TTF2Y', new Set(['1MA090']));
    expect(loadManualPassed('OTHER').size).toBe(0);
  });

  it('clears the entry when the last mark is removed', () => {
    saveManualPassed('TTF2Y', new Set(['1MA090']));
    saveManualPassed('TTF2Y', new Set());
    expect(loadManualPassed('TTF2Y').size).toBe(0);
  });

  it('ignores stored junk rather than breaking the map', () => {
    window.localStorage.setItem('uuais.programs.completed.v1', 'not json');
    expect(loadManualPassed('TTF2Y').size).toBe(0);
  });

  it('ignores a stored shape from an older version', () => {
    window.localStorage.setItem('uuais.programs.completed.v1', '["1MA090"]');
    expect(loadManualPassed('TTF2Y').size).toBe(0);
  });

  it('drops non-string entries', () => {
    window.localStorage.setItem('uuais.programs.completed.v1', '{"TTF2Y":["1MA090",42,null]}');
    expect([...loadManualPassed('TTF2Y')]).toEqual(['1MA090']);
  });

  it('survives storage being unavailable', () => {
    const original = window.localStorage.getItem;
    // A private window throws on access rather than returning null.
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(loadManualPassed('TTF2Y').size).toBe(0);
    jest.restoreAllMocks();
    expect(original).toBeDefined();
  });
});
