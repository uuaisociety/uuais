import { sanitizeZipEntryName, buildApplicantText, exportApplicationsZip } from '@/lib/exportApplications'
import type { TeamApplication } from '@/types'

jest.mock('jszip')

const roleById = new Map([
  ['it_member', { title: 'IT Member', teamId: 'it' }],
  ['dev_member', { title: 'Development Member', teamId: 'development' }],
])

const teamName = (id: string) => (id === 'it' ? 'IT' : id === 'development' ? 'Development' : id)

const questionMap = new Map([['q1', 'Why are you applying?']])

const baseApp: TeamApplication = {
  id: 'app-1',
  campaignId: 'spring2026',
  name: 'Alice Doe',
  email: 'alice@test.com',
  program: 'MSc Data Science',
  graduationYear: '2027',
  linkedin: 'https://linkedin.com/in/alice',
  weeklyHours: 8,
  interests: ['ai', 'robotics'],
  roleRanking: [
    { roleId: 'it_member', teamId: 'it', justification: 'I know systems.' },
    { roleId: 'dev_member', teamId: 'development', justification: 'I build web apps.' },
  ],
  motivation: 'I want to contribute to the society.',
  customAnswers: { q1: 'Because it is great.' },
  createdAt: '2026-04-01',
}

describe('sanitizeZipEntryName', () => {
  it('replaces illegal filesystem characters', () => {
    expect(sanitizeZipEntryName('A/B:C*D"E<F>G|H?I\\J')).toBe('A-B-C-D-E-F-G-H-I-J')
  })

  it('collapses whitespace and trims', () => {
    expect(sanitizeZipEntryName('  Alice   Doe  ')).toBe('Alice Doe')
  })

  it('falls back when the result is empty', () => {
    expect(sanitizeZipEntryName('???')).toBe('applicant')
  })
})

describe('buildApplicantText', () => {
  const opts = { applications: [], campaignTitle: 'Spring 2026', roleById, teamName, questionMap }

  it('includes general fields, role ranking, motivation and custom answers', () => {
    const text = buildApplicantText(baseApp, opts)
    expect(text).toContain('Application for: Spring 2026')
    expect(text).toContain('Name: Alice Doe')
    expect(text).toContain('Email: alice@test.com')
    expect(text).toContain('Program: MSc Data Science')
    expect(text).toContain('Graduation year: 2027')
    expect(text).toContain('LinkedIn: https://linkedin.com/in/alice')
    expect(text).toContain('Weekly hours: 8')
    expect(text).toContain('Interests: ai, robotics')
    expect(text).toContain('1. IT Member (IT)')
    expect(text).toContain('Justification: I know systems.')
    expect(text).toContain('2. Development Member (Development)')
    expect(text).toContain('I want to contribute to the society.')
    expect(text).toContain('Why are you applying?: Because it is great.')
    expect(text).toContain('Resume: not provided')
  })

  it('renders legacy team ranking when no roleRanking exists', () => {
    const legacy = { ...baseApp, roleRanking: undefined, teamRanking: ['it', 'development'] }
    const text = buildApplicantText(legacy, opts)
    expect(text).toContain('Team preferences:')
    expect(text).toContain('1. IT')
    expect(text).toContain('2. Development')
  })

  it('joins array custom answers with commas', () => {
    const app = { ...baseApp, customAnswers: { q1: ['a', 'b'] } }
    const text = buildApplicantText(app, opts)
    expect(text).toContain('Why are you applying?: a, b')
  })
})

describe('exportApplicationsZip', () => {
  let MockZip: jest.Mock
  let mockFolderFile: jest.Mock
  let mockGenerateAsync: jest.Mock

  beforeEach(() => {
    mockFolderFile = jest.fn()
    mockGenerateAsync = jest.fn().mockResolvedValue(new Blob(['zip']))
    const mockFolder = jest.fn(() => ({ file: mockFolderFile }))
    MockZip = jest.fn(() => ({ folder: mockFolder, generateAsync: mockGenerateAsync }))
    ;(jest.requireMock('jszip') as jest.Mock).mockImplementation(MockZip)
    global.fetch = jest.fn()
    URL.createObjectURL = jest.fn(() => 'blob:mock')
    URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('fetches resumes through the admin route and writes general info text into per-applicant folders', async () => {
    const appWithResume = {
      ...baseApp,
      resume: { path: 'team-applications/123_alice_cv.pdf', url: 'https://storage.example/alice.pdf?token=abc' },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })

    await exportApplicationsZip({
      applications: [appWithResume],
      campaignTitle: 'Spring 2026',
      roleById,
      teamName,
      questionMap,
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/team-applications/resume?path=team-applications%2F123_alice_cv.pdf')
    expect(MockZip).toHaveBeenCalled()
    expect(mockFolderFile).toHaveBeenCalledWith('alice_cv.pdf', expect.any(ArrayBuffer))
    const textCall = mockFolderFile.mock.calls.find(([name]: [string]) => name === 'Alice Doe - IT Member.txt')
    expect(textCall).toBeDefined()
    expect(String(textCall[1])).toContain('Name: Alice Doe')
    expect(mockGenerateAsync).toHaveBeenCalledWith({ type: 'blob' })
  })

  it('falls back to the stored signed URL when no resume path exists', async () => {
    const appWithUrlOnly = {
      ...baseApp,
      resume: { url: 'https://storage.example/alice.pdf?token=abc' },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })

    await exportApplicationsZip({
      applications: [appWithUrlOnly],
      campaignTitle: 'Spring 2026',
      roleById,
      teamName,
      questionMap,
    })

    expect(global.fetch).toHaveBeenCalledWith('https://storage.example/alice.pdf?token=abc')
    const textCall = mockFolderFile.mock.calls.find(([name]: [string]) => name === 'Alice Doe - IT Member.txt')
    expect(String(textCall[1])).toContain('Name: Alice Doe')
  })

  it('marks the resume as failed when the fetch rejects', async () => {
    const appWithResume = {
      ...baseApp,
      resume: { path: 'team-applications/123_cv.pdf', url: 'https://storage.example/cv.pdf' },
    }
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))

    await exportApplicationsZip({
      applications: [appWithResume],
      campaignTitle: 'Spring 2026',
      roleById,
      teamName,
      questionMap,
    })

    const textCall = mockFolderFile.mock.calls.find(([name]: [string]) => name === 'Alice Doe - IT Member.txt')
    expect(String(textCall[1])).toContain('Resume: download failed')
    expect(mockFolderFile).not.toHaveBeenCalledWith('cv.pdf', expect.anything())
  })

  it('skips folder creation for resumes with non-ok responses', async () => {
    const appWithResume = {
      ...baseApp,
      resume: { path: 'team-applications/123_cv.pdf', url: 'https://storage.example/cv.pdf' },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403 })

    await exportApplicationsZip({
      applications: [appWithResume],
      campaignTitle: 'Spring 2026',
      roleById,
      teamName,
      questionMap,
    })

    const textCall = mockFolderFile.mock.calls.find(([name]: [string]) => name === 'Alice Doe - IT Member.txt')
    expect(String(textCall[1])).toContain('Resume: download failed')
  })
})
