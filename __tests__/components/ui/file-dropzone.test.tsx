import { render, screen, fireEvent } from '@testing-library/react'
import FileDropzone from '@/components/ui/FileDropzone'

function createFile(name = 'test.png', type = 'image/png', content = 'test') {
  return new File([content], name, { type })
}

describe('FileDropzone', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders dropzone area', () => {
    render(<FileDropzone />)
    expect(screen.getByText(/Drop an image/)).toBeInTheDocument()
  })

  it('shows uploading state', () => {
    render(<FileDropzone uploading />)
    expect(screen.getByText('Uploading...')).toBeInTheDocument()
  })

  it('shows deleting state', () => {
    render(<FileDropzone deleting />)
    expect(screen.getByText('Deleting...')).toBeInTheDocument()
  })

  it('shows initial preview from initialUrl', () => {
    render(<FileDropzone initialUrl="/test.jpg" initialPath="test.jpg" />)
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('calls onFileSelected when file is uploaded', () => {
    const onFileSelected = jest.fn()
    render(<FileDropzone onFileSelected={onFileSelected} />)
    const input = screen.getByLabelText('browse')
    const file = createFile()
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFileSelected).toHaveBeenCalledWith(file)
  })

  it('calls onError for invalid file type', () => {
    const onError = jest.fn()
    render(<FileDropzone onError={onError} accept="image/*" />)
    const input = screen.getByLabelText('browse')
    const file = createFile('test.pdf', 'application/pdf')
    fireEvent.change(input, { target: { files: [file] } })
    expect(onError).toHaveBeenCalled()
  })

  it('calls onError for oversized file', () => {
    const onError = jest.fn()
    render(<FileDropzone onError={onError} maxSizeBytes={10} />)
    const input = screen.getByLabelText('browse')
    const file = createFile('test.png', 'image/png', 'this is a very large file content')
    fireEvent.change(input, { target: { files: [file] } })
    expect(onError).toHaveBeenCalled()
  })

  it('shows delete button when initialPath provided', () => {
    const onDelete = jest.fn()
    render(<FileDropzone initialUrl="/test.jpg" initialPath="test.jpg" onDelete={onDelete} />)
    expect(screen.getByText('Delete file')).toBeInTheDocument()
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = jest.fn()
    render(<FileDropzone initialUrl="/test.jpg" initialPath="test.jpg" onDelete={onDelete} />)
    fireEvent.click(screen.getByText('Delete file'))
    expect(onDelete).toHaveBeenCalledWith('test.jpg')
  })

  it('accepts dropped file and calls onFileSelected', () => {
    const onFileSelected = jest.fn()
    render(<FileDropzone onFileSelected={onFileSelected} />)
    const dropzone = screen.getByText(/Drop an image/).closest('div')?.parentElement
    const file = createFile()
    fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } })
    expect(onFileSelected).toHaveBeenCalledWith(file)
  })

  it('sets dragging state on dragOver and clears on dragLeave', () => {
    render(<FileDropzone />)
    const outer = screen.getByText(/Drop an image/).closest('[class*="border"]')!
    fireEvent.dragOver(outer)
    expect(outer.className).toContain('border-blue-400')
    fireEvent.dragLeave(outer)
    expect(outer.className).not.toContain('border-blue-400')
  })

  it('handles onFileSelected throwing without crashing', () => {
    const onError = jest.fn()
    const onFileSelected = jest.fn(() => { throw new Error('upload fail') })
    render(<FileDropzone onFileSelected={onFileSelected} onError={onError} />)
    const input = screen.getByLabelText('browse')
    fireEvent.change(input, { target: { files: [createFile()] } })
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'upload fail' }))
  })

  it('shows warning when delete clicked without onDelete handler', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    render(<FileDropzone initialUrl="/test.jpg" initialPath="test.jpg" />)
    fireEvent.click(screen.getByText('Delete file'))
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('does not affect browse input when no files selected', () => {
    const onFileSelected = jest.fn()
    render(<FileDropzone onFileSelected={onFileSelected} />)
    const input = screen.getByLabelText('browse')
    fireEvent.change(input, { target: { files: null } })
    expect(onFileSelected).not.toHaveBeenCalled()
  })
})
