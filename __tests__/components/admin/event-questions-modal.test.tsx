import { render, screen, fireEvent } from '@testing-library/react';
import EventQuestionsModal from '@/components/pages/admin/modals/EventQuestionsModal';
import type { EventCustomQuestion } from '@/types';

const questions: EventCustomQuestion[] = [
  {
    id: 'q1',
    eventId: 'evt1',
    question: 'Email',
    type: 'text',
    required: true,
    order: 1,
  },
  {
    id: 'q2',
    eventId: 'evt1',
    question: 'Favourite colour',
    type: 'text',
    required: false,
    order: 2,
  },
];

function renderModal() {
  return render(
    <EventQuestionsModal
      open
      eventTitle="Test Event"
      eventId="evt1"
      questions={questions}
      onClose={jest.fn()}
      onAdd={jest.fn()}
      onUpdate={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
}

describe('EventQuestionsModal prefill indicators', () => {
  it('shows which profile field a stored question pre-fills from', () => {
    renderModal();
    expect(
      screen.getByText('May pre-fill from member profile: Email'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/May pre-fill from member profile/),
    ).toHaveLength(1);
  });

  it('shows a live hint while typing a matching question', () => {
    renderModal();
    const questionInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(questionInput, {
      target: { value: 'LinkedIn' },
    });
    expect(
      screen.queryByText('May pre-fill from member profile: LinkedIn'),
    ).toBeInTheDocument();
  });

  it('hides the hint for file upload questions', () => {
    renderModal();
    const questionInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(questionInput, {
      target: { value: 'LinkedIn' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'file' },
    });
    expect(
      screen.queryByText('May pre-fill from member profile: LinkedIn'),
    ).not.toBeInTheDocument();
  });
});
