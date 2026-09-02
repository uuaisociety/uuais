import {
  detectCertificateType,
  normaliseLigatures,
  parseLadokCertificate,
  redactPersonalData,
  splitRegistrations,
} from '@/lib/programs/ladok';

/**
 * Invented certificates in Ladok's own pdftotext layout — column alignment, page furniture,
 * wrapped titles and the fi ligature all matter to the parser, so they are reproduced exactly.
 * No real student: the name and identity number are placeholders.
 */
const TRANSCRIPT = `Ofﬁcial Transcript of Records                                                                         Print date
                                                                                                     2026-09-01


Name                                                            Personal identity number
Test Student                                             19900101-0000



Completed courses
Code          Name                                              Scope          Grade     Date              Note
1MA090        Algebra and Geometry                                 5.0 hp      5         2023-10-25        1
1TE609        Introduction to Engineering Physics                  5.0 hp      G         2023-12-12        2
1TD433        Computer Programming I                               5.0 hp      5         2024-01-16        1
1MA013        Single Variable Calculus                            10.0 hp      5         2024-01-28        1
1FA105        Mechanics Basic Course                              10.0 hp      5         2024-03-12        1
1TE720        Electric Measurement Techniques                      5.0 hp      5         2024-04-24        1
1TD722        Computer Programming II                              5.0 hp      5         2024-05-29        1
1TE760        Applied Mechanics I                                  5.0 hp      4         2024-05-30        1
1FA514        Electromagnetism I                                   5.0 hp      5         2024-06-01        1
1MA016        Several Variable Calculus                           10.0 hp      5         2024-06-19        1
1TE624        Electronics I                                        5.0 hp      5         2024-10-29        1
1MS005        Probability and Statistics                           5.0 hp      5         2024-10-31        1
1MA034        Transform Methods                                    5.0 hp      5         2024-11-03        1
1MA024        Linear Algebra II                                    5.0 hp      5         2025-01-13        1
1TM014        Applied Mechanics II                                 5.0 hp      4         2025-01-15        1
1TE626        Electromagnetism II                                  5.0 hp      4         2025-01-17        1
1TD343        Introduction to Scientific Computing F               5.0 hp      5         2025-03-28        1
1TE058        Creative Workshop Practice                           5.0 hp      G         2025-04-01        2
1FA527        Technical Thermodynamics                             5.0 hp      4         2025-04-07        1
1FA522        Waves and Optics                                     5.0 hp      4         2025-04-14        1
1TD352        Scientific Computing for Data Analysis               5.0 hp      4         2025-05-27        1
1FA121        Mathematical Methods of Physics                      5.0 hp      5         2025-06-05        1
1TE623        Energy and Environmental Technology                  5.0 hp      5         2025-06-05        1
1TE661        Signals and Systems                                  5.0 hp      5         2025-10-28        1
1FA535        Quantum Physics F                                   10.0 hp      5         2025-10-31        1
1TM013        Solid State Physics F                                5.0 hp      5         2026-01-08        1
1RT490        Automatic Control I                                  5.0 hp      5         2026-01-14        1
1DL301        Database Design I                                    5.0 hp      4         2026-01-15        1
1DT038        Computer Architecture I                              5.0 hp      4         2026-01-25        1




Check the certificate on: https://student.ladok.se/verifiera/               Personal identity number: 19900101-0000
Verifiable until: 2026-11-30                                                              Control code: XXXXXXXXXX

                                                                                                         Page 1 / 2
\fTest Student                                    Official Transcript of Records                                    Print date
19900101-0000                                                                                                           2026-09-01




Code          Name                                                             Scope           Grade     Date              Note
1TD354        Scientific Computing for Partial Differential                        5.0 hp      5         2026-01-29        1
              Equations
1FA103        Mechanics III                                                        5.0 hp      5         2026-03-13        1
1RT700        Statistical Machine Learning                                         5.0 hp      5         2026-03-20        1
1EL002        Applied Fluid Mechanics                                              5.0 hp      4         2026-03-31        1
1TD062        High Performance Programming                                        10.0 hp      5         2026-04-20        1
1TE664        Independent Project in Engineering Physics                          15.0 hp      G         2026-06-13        2



Summation
Total                                     included credited parts              Credited education
210.0 hp



Notes and information
60 credits (hp) represent a full academic year. The system is compatible with ECTS credits (the European
Credit Transfer System) as one credit is equal to one ECTS credit.

      1    Grading scale: Pass with distinction (5), Pass with credit (4), Pass (3), Fail (U)
      2    Grading scale: Pass (G), Fail (U)

The above is an excerpt from the student registry.




Check the certificate on: https://student.ladok.se/verifiera/                               Personal identity number: 19900101-0000
Verifiable until: 2026-11-30                                                                              Control code: XXXXXXXXXX

Postal address                                                                                                           Page 2 / 2
Uppsala University
Box 256
751 05 Uppsala
\f`;

const REGISTRATION = `Certiﬁcate of Registration                                                                                            Print date
                                                                                                                     2026-09-01


Name                                                                        Personal identity number
Test Student                                                         19900101-0000



TTF2Y Master's Programme in Engineering Physics (300.0 hp)
Start period: HT2023 2023-08-28 - 2024-01-14
Registered on
Code             Name                                                       Scope         Period                         Notes
1TD452           Numerical Linear Algebra                                     5.0 hp      2026-08-31 - 2026-11-01
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1DT044           Operating Systems I                                          5.0 hp      2026-08-31 - 2026-11-01
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1RT730           Large Language Models and Societal                           5.0 hp      2026-08-31 - 2026-11-01
                 Consequences of Artificial Intelligence
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1MA356           Functional Analysis with Applications                        5.0 hp      2026-08-31 - 2026-11-01
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1RT705           Advanced Probabilistic Machine Learning                      5.0 hp      2026-08-31 - 2026-11-01
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TE664           Independent Project in Engineering Physics                  15.0 hp      2026-03-23 - 2026-06-07
                 Rate of study: 100 %, Teaching hours: Day-time, Type
                 of instruction: Normal teaching, Study location: Uppsala
1EL002           Applied Fluid Mechanics                                      5.0 hp      2026-01-19 - 2026-03-22
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1RT700           Statistical Machine Learning                                 5.0 hp      2026-01-19 - 2026-03-22
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TD062           High Performance Programming                                10.0 hp      2026-01-19 - 2026-03-22
                 Rate of study: 67 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1FA103           Mechanics III                                                5.0 hp      2026-01-19 - 2026-03-22
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1RT490           Automatic Control I                                          5.0 hp      2025-11-03 - 2026-01-18
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala




Check the certificate on: https://student.ladok.se/verifiera/                              Personal identity number: 19900101-0000
Verifiable until: 2026-11-30                                                                               Control code: XXXXXXXXXX

                                                                                                                        Page 1 / 4
\fTest Student                                      Certificate of Registration                        Uppsala University
19900101-0000                                                                                                      2026-09-01




Code             Name                                                      Scope       Period                         Notes
1DT038           Computer Architecture I                                      5.0 hp   2025-11-03 - 2026-01-18
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TM013           Solid State Physics F                                        5.0 hp   2025-11-03 - 2026-01-18
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TD354           Scientific Computing for Partial Differential                5.0 hp   2025-11-03 - 2026-01-18
                 Equations
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TE661           Signals and Systems                                          5.0 hp   2025-09-01 - 2025-11-02
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1FA535           Quantum Physics F                                          10.0 hp    2025-09-01 - 2025-11-02
                 Rate of study: 67 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1DL301           Database Design I                                            5.0 hp   2025-09-01 - 2025-11-02
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1FA121           Mathematical Methods of Physics                              5.0 hp   2025-03-24 - 2025-06-08
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TE623           Energy and Environmental Technology                          5.0 hp   2025-03-24 - 2025-06-08
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TD352           Scientific Computing for Data Analysis                       5.0 hp   2025-03-24 - 2025-06-08
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TD343           Introduction to Scientific Computing F                       5.0 hp   2025-01-20 - 2025-03-23
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1FA527           Technical Thermodynamics                                     5.0 hp   2025-01-20 - 2025-03-23
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1FA522           Waves and Optics                                             5.0 hp   2025-01-20 - 2025-03-23
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TM014           Applied Mechanics II                                         5.0 hp   2024-11-04 - 2025-01-19
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TE626           Electromagnetism II                                          5.0 hp   2024-11-04 - 2025-01-19
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1MA024           Linear Algebra II                                            5.0 hp   2024-11-04 - 2025-01-19
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1MA034           Transform Methods                                            5.0 hp   2024-09-02 - 2024-11-03
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala




Check the certificate on: https://student.ladok.se/verifiera/                           Personal identity number: 19900101-0000
Verifiable until: 2026-11-30                                                                            Control code: XXXXXXXXXX

                                                                                                                     Page 2 / 4
\fTest Student                                      Certificate of Registration                           Uppsala University
19900101-0000                                                                                                         2026-09-01




Code             Name                                                          Scope      Period                         Notes
1TE058           Creative Workshop Practice                                      5.0 hp   2024-09-02 - 2025-01-19
                 Rate of study: 17 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1MS005           Probability and Statistics                                      5.0 hp   2024-09-02 - 2024-11-03
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TE624           Electronics I                                                   5.0 hp   2024-09-02 - 2024-11-03
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TE760           Applied Mechanics I                                             5.0 hp   2024-03-18 - 2024-06-02
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TD722           Computer Programming II                                         5.0 hp   2024-03-18 - 2024-06-02
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1FA514           Electromagnetism I                                              5.0 hp   2024-03-18 - 2024-06-02
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1MA016           Several Variable Calculus                                      10.0 hp   2024-01-15 - 2024-06-02
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TE720           Electric Measurement Techniques                                 5.0 hp   2024-01-15 - 2024-03-17
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1FA105           Mechanics Basic Course                                          5.0 hp   2024-01-15 - 2024-03-17 1
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1FA105           Mechanics Basic Course                                          5.0 hp   2023-10-31 - 2024-01-14
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TD433           Computer Programming I                                          5.0 hp   2023-10-31 - 2024-01-14
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1MA090           Algebra and Geometry                                            5.0 hp   2023-08-28 - 2023-10-30
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1TE609           Introduction to Engineering Physics                             5.0 hp   2023-08-28 - 2023-10-30
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala
1MA013           Single Variable Calculus                                       10.0 hp   2023-08-28 - 2024-01-14
                 Rate of study: 33 %, Teaching hours: Day-time, Type of
                 instruction: Normal teaching, Study location: Uppsala




Self-contained courses
Code             Name                                                          Scope      Period                         Notes
2FE032           Economy, Accounting and Analysis                               15.0 hp   2025-01-20 - 2025-06-08
                 Rate of study: 50 %, Teaching hours: Mixed-time, Type
                 of instruction: Distance learning, Study location: Flexible




Check the certificate on: https://student.ladok.se/verifiera/                              Personal identity number: 19900101-0000
Verifiable until: 2026-11-30                                                                               Control code: XXXXXXXXXX

                                                                                                                        Page 3 / 4
\fTest Student                                      Certificate of Registration                       Uppsala University
19900101-0000                                                                                                     2026-09-01




Notes and information
60 credits (hp) represent a full academic year. The system is compatible with ECTS credits (the European
Credit Transfer System) as one credit is equal to one ECTS credit.

      1    Continued from previous period

The above is an excerpt from the student records




Check the certificate on: https://student.ladok.se/verifiera/                          Personal identity number: 19900101-0000
Verifiable until: 2026-11-30                                                                           Control code: XXXXXXXXXX

Postal address                                                                                                      Page 4 / 4
Uppsala University
Box 256
751 05 Uppsala
\f`;

describe('detectCertificateType', () => {
  it('recognises an official transcript of records', () => {
    expect(detectCertificateType(TRANSCRIPT)).toBe('TRANSCRIPT');
  });

  it('recognises a certificate of registration', () => {
    expect(detectCertificateType(REGISTRATION)).toBe('REGISTRATION');
  });

  it('recognises the Swedish names', () => {
    expect(detectCertificateType('Resultatintyg\nAvklarade kurser')).toBe('TRANSCRIPT');
    expect(detectCertificateType('Registreringsintyg')).toBe('REGISTRATION');
  });

  it('sees through the ligatures PDF extraction leaves behind', () => {
    // pdftotext renders "Certificate" with an fi ligature.
    expect(detectCertificateType('Certi\ufb01cate of Registration')).toBe('REGISTRATION');
    expect(detectCertificateType('Of\ufb01cial Transcript of Records')).toBe('TRANSCRIPT');
  });

  it('reports an unrelated document as unknown', () => {
    expect(detectCertificateType('Invoice #42')).toBe('UNKNOWN');
  });
});

describe('normaliseLigatures', () => {
  it('expands the ligatures a PDF extractor emits', () => {
    expect(normaliseLigatures('Of\ufb01cial \ufb02ow e\ufb00ort')).toBe('Official flow effort');
  });

  it('leaves ordinary text unchanged', () => {
    expect(normaliseLigatures('Algebra and Geometry')).toBe('Algebra and Geometry');
  });
});

describe('redactPersonalData', () => {
  it('removes a personal identity number', () => {
    expect(redactPersonalData('Pnr 19900101-0000 here')).toBe('Pnr [redacted] here');
  });

  it('removes one written without a hyphen', () => {
    expect(redactPersonalData('199001010000')).toBe('[redacted]');
  });

  it('leaves ordinary text alone', () => {
    expect(redactPersonalData('1MA090 Algebra 5.0 hp')).toBe('1MA090 Algebra 5.0 hp');
  });
});

describe('parseLadokCertificate — transcript', () => {
  const result = parseLadokCertificate(TRANSCRIPT);

  it('reads every completed course across both pages', () => {
    expect(result.completed).toHaveLength(35);
  });

  it('accounts for the full credit total the certificate states', () => {
    // The transcript's own summation line reads 210.0 hp.
    expect(result.completed.reduce((sum, c) => sum + c.credits, 0)).toBe(210);
  });

  it('rejoins a title that wrapped onto the next line', () => {
    expect(result.completed.find((c) => c.code === '1TD354')?.title).toBe(
      'Scientific Computing for Partial Differential Equations'
    );
  });

  it('reads code, title and credits', () => {
    const algebra = result.completed.find((c) => c.code === '1MA090');
    expect(algebra).toEqual({ code: '1MA090', title: 'Algebra and Geometry', credits: 5 });
  });

  it('reads a ten-credit course', () => {
    expect(result.completed.find((c) => c.code === '1FA535')?.credits).toBe(10);
  });

  it('never exposes a grade', () => {
    // The transcript prints grades of 5, 4 and G; none may survive parsing.
    const serialised = JSON.stringify(result);
    expect(Object.keys(result.completed[0])).toEqual(['code', 'title', 'credits']);
    expect(serialised).not.toContain('"grade"');
  });

  it('never exposes the personal identity number', () => {
    expect(JSON.stringify(result)).not.toContain('19900101');
  });

  it('treats a transcript as proving completion, not registration', () => {
    expect(result.registered).toHaveLength(0);
  });

  it('does not mistake the table header for a course', () => {
    expect(result.completed.some((c) => /^Name$/i.test(c.title))).toBe(false);
  });
});

describe('parseLadokCertificate — registration', () => {
  const result = parseLadokCertificate(REGISTRATION);

  it('identifies the programme the student is admitted to', () => {
    expect(result.programCode).toBe('TTF2Y');
    expect(result.programName).toContain('Engineering Physics');
  });

  it('reads registrations with their teaching period', () => {
    const linear = result.registered.find((c) => c.code === '1TD452');
    expect(linear).toMatchObject({
      code: '1TD452',
      title: 'Numerical Linear Algebra',
      credits: 5,
      start: '2026-08-31',
      end: '2026-11-01',
    });
  });

  it('rejoins a title that wrapped onto the next line', () => {
    expect(result.registered.find((c) => c.code === '1TD354')?.title).toBe(
      'Scientific Computing for Partial Differential Equations'
    );
  });

  it('never treats a registration as a completion', () => {
    // Registration proves attendance, never a pass.
    expect(result.completed).toHaveLength(0);
  });

  it('skips the metadata Ladok prints beneath each registration', () => {
    expect(result.registered.some((c) => /rate of study/i.test(c.title))).toBe(false);
  });

  it('keeps one entry per course even across pages', () => {
    const codes = result.registered.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('never exposes the personal identity number', () => {
    expect(JSON.stringify(result)).not.toContain('19900101');
  });
});

describe('splitRegistrations', () => {
  const registrations = [
    { code: 'A', title: 'A', credits: 5, start: '2026-08-31', end: '2026-11-01' },
    { code: 'B', title: 'B', credits: 5, start: '2025-01-20', end: '2025-03-23' },
    { code: 'C', title: 'C', credits: 5, start: '2027-01-01', end: '2027-03-01' },
  ];

  it('counts a registration spanning today as current', () => {
    const { current } = splitRegistrations(registrations, new Date('2026-09-15'));
    expect(current.map((r) => r.code)).toEqual(['A']);
  });

  it('counts a finished registration as past', () => {
    const { past } = splitRegistrations(registrations, new Date('2026-09-15'));
    expect(past.map((r) => r.code)).toEqual(['B']);
  });

  it('treats a future registration as neither — it is a plan, not progress', () => {
    const { current, past } = splitRegistrations(registrations, new Date('2026-09-15'));
    expect(current.map((r) => r.code)).not.toContain('C');
    expect(past.map((r) => r.code)).not.toContain('C');
  });
});
