import React, { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ShowcaseModal, { ShowcaseFormState } from '@/components/pages/admin/modals/ShowcaseModal'
import { SHOWCASE_LIMITS } from '@/types'

const mockNotify = jest.fn()
jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: mockNotify }),
}))

// ShowcaseModal pulls parseTags from ShowcaseSubmissionModal, which imports the users helper; stop the chain before the real Firebase client loads.
jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn().mockResolvedValue({ isMember: true }),
}))

const baseForm: ShowcaseFormState = {
  title: '',
  description: '',
  details: '',
  category: 'app',
  links: {},
  tags: [],
  coverImage: '',
  coverImagePath: '',
}

const existingProject: ShowcaseFormState = {
  title: 'Course Navigator',
  description: 'Explore UU courses with AI.',
  details: 'Longer story here.',
  category: 'app',
  links: { github: 'https://github.com/uu-ai-society/course-navigator' },
  tags: ['ai', 'hackathon'],
  coverImage: 'https://cdn.example/cover.png',
  coverImagePath: 'showcase/cover.png',
}

// The parent (ShowcaseTab) owns the form, so the harness must re-render the modal with each setForm call — otherwise the controlled inputs never move and the native `required` validation keeps blocking submit.
function renderModal(overrides: Partial<React.ComponentProps<typeof ShowcaseModal>> = {}) {
  const onSubmit = jest.fn()
  const onClose = jest.fn()
  const mockSetForm = jest.fn()
  let latestForm: ShowcaseFormState = { ...baseForm, ...(overrides.form || {}) }

  function Harness() {
    const [form, setFormState] = useState<ShowcaseFormState>(() => ({ ...baseForm, ...(overrides.form || {}) }))
    latestForm = form
    const setForm = (updater: unknown) => {
      mockSetForm(updater)
      setFormState((prev) =>
        typeof updater === 'function'
          ? (updater as (p: ShowcaseFormState) => ShowcaseFormState)(prev)
          : (updater as ShowcaseFormState),
      )
    }
    return (
      <ShowcaseModal
        open={true}
        editing={false}
        form={form}
        setForm={setForm}
        onClose={onClose}
        onSubmit={onSubmit}
        {...overrides}
      />
    )
  }

  render(<Harness />)
  return { onSubmit, onClose, mockSetForm, getForm: () => latestForm }
}

function fillRequired() {
  fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'Course Navigator' } })
  fireEvent.change(screen.getByRole('textbox', { name: /Description/ }), {
    target: { value: 'Explore UU courses with AI.' },
  })
}

describe('ShowcaseModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing while closed', () => {
    renderModal({ open: false })
    expect(screen.queryByRole('heading', { name: 'Create New Showcase Project' })).not.toBeInTheDocument()
  })

  it('prefills the form with existing values when editing', () => {
    renderModal({ editing: true, form: existingProject })
    expect(screen.getByRole('heading', { name: 'Edit Showcase Project' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Course Navigator')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Explore UU courses with AI.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://github.com/uu-ai-society/course-navigator')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://cdn.example/cover.png')).toBeInTheDocument()
    expect(screen.getByDisplayValue('showcase/cover.png')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update Project' })).toBeInTheDocument()
  })

  it('shows the create heading and button in create mode', () => {
    renderModal()
    expect(screen.getByRole('heading', { name: 'Create New Showcase Project' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument()
  })

  it('enforces SHOWCASE_LIMITS maxLengths on the text fields', () => {
    renderModal()
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveAttribute(
      'maxlength', String(SHOWCASE_LIMITS.title))
    expect(screen.getByRole('textbox', { name: /Description/ })).toHaveAttribute(
      'maxlength', String(SHOWCASE_LIMITS.description))
    expect(screen.getByRole('textbox', { name: /About this project/ })).toHaveAttribute(
      'maxlength', String(SHOWCASE_LIMITS.details))
    expect(screen.getByPlaceholderText('https://github.com/you/project')).toHaveAttribute(
      'maxlength', String(SHOWCASE_LIMITS.link))
  })

  it('adds tags through the shared parser and previews them', () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('llm, hackathon, next.js'), {
      target: { value: 'LLM, Hackathon' },
    })
    expect(document.getElementById('showcase-tags-preview')).toHaveTextContent('llm')
    expect(document.getElementById('showcase-tags-preview')).toHaveTextContent('hackathon')
  })

  it('removes a tag by clearing it from the field', () => {
    const { getForm } = renderModal({ form: { ...baseForm, tags: ['llm', 'hackathon'] } })
    const field = screen.getByPlaceholderText('llm, hackathon, next.js')
    expect(field).toHaveValue('llm, hackathon')
    fireEvent.change(field, { target: { value: 'llm' } })
    expect(getForm().tags).toEqual(['llm'])
  })

  it('commits parsed tags to the form on submit so the parent payload is clean', () => {
    const { onSubmit, mockSetForm, getForm } = renderModal()
    fillRequired()
    fireEvent.change(screen.getByPlaceholderText('llm, hackathon, next.js'), {
      target: { value: 'LLM, Hackathon, LLM ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(getForm().tags).toEqual(['llm', 'hackathon'])
    expect(mockSetForm).toHaveBeenCalled()
  })

  it('blocks submit when a tag is too long', () => {
    const { onSubmit } = renderModal()
    fillRequired()
    fireEvent.change(screen.getByPlaceholderText('llm, hackathon, next.js'), {
      target: { value: 'z'.repeat(SHOWCASE_LIMITS.tag + 1) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }))
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tag too long' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('blocks submit when there are more tags than the limit', () => {
    const { onSubmit } = renderModal()
    fillRequired()
    fireEvent.change(screen.getByPlaceholderText('llm, hackathon, next.js'), {
      target: { value: 'a,b,c,d,e,f' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }))
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Too many tags' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  // The title and description inputs are `required`; the browser blocks the submit event before the modal's own tag guards ever run.
  it('native required validation blocks submit on an empty form', () => {
    const { onSubmit } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('edits links, category, details and cover fields through setForm', () => {
    const { getForm } = renderModal()
    fireEvent.change(screen.getByPlaceholderText('https://github.com/you/project'), {
      target: { value: 'https://github.com/uu-ai-society/course-navigator' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: /Category/ }), {
      target: { value: 'model' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /About this project/ }), {
      target: { value: 'Longer story.' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /Cover image URL/ }), {
      target: { value: 'https://cdn.example/cover.png' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /Cover image path/ }), {
      target: { value: 'showcase/cover.png' },
    })
    const form = getForm()
    expect(form.links.github).toBe('https://github.com/uu-ai-society/course-navigator')
    expect(form.category).toBe('model')
    expect(form.details).toBe('Longer story.')
    expect(form.coverImage).toBe('https://cdn.example/cover.png')
    expect(form.coverImagePath).toBe('showcase/cover.png')
  })

  it('fires onClose from the Cancel button', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})