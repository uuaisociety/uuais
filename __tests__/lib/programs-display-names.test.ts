import { programDisplayNames } from '@/lib/programs/format';
describe('programDisplayNames', () => {
  it('leads with the English name and keeps Swedish beneath', () => {
    expect(programDisplayNames(
      'Civilingenjörsprogrammet i teknisk fysik, 300 hp (TTF2Y)',
      "Master's Programme in Engineering Physics, 300 credits (TTF2Y)"
    )).toEqual({
      primary: "Master's Programme in Engineering Physics",
      secondary: 'Civilingenjörsprogrammet i teknisk fysik',
    });
  });

  it('never borrows the English specialisation of a shared code', () => {
    // All seven TFY2M variants publish the same English title.
    const geo = programDisplayNames(
      'Masterprogram i fysik – Geofysik, 120 hp (TFY2M)',
      "Master's Programme in Physics – Theoretical Physics: Quantum Fields and Strings, 120 credits (TFY2M)"
    );
    expect(geo.primary).toBe("Master's Programme in Physics — Geofysik");
    expect(geo.primary).not.toMatch(/Theoretical/);
    expect(geo.secondary).toBe('Masterprogram i fysik – Geofysik');
  });

  it('keeps variants distinguishable rather than printing identical rows', () => {
    const a = programDisplayNames('Masterprogram i fysik – Geofysik, 120 hp (TFY2M)', "Master's Programme in Physics, 120 credits (TFY2M)");
    const b = programDisplayNames('Masterprogram i fysik – Matematisk fysik, 120 hp (TFY2M)', "Master's Programme in Physics, 120 credits (TFY2M)");
    expect(a.primary).not.toBe(b.primary);
  });

  it('falls back to Swedish when no English title exists', () => {
    expect(programDisplayNames('Masterprogram i kemi, 120 hp (TKE2M)', null))
      .toEqual({ primary: 'Masterprogram i kemi', secondary: null });
  });
});
