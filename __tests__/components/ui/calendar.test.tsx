import { fireEvent, render, screen } from '@testing-library/react';
import { Calendar } from '@/components/ui/calendar';

describe('Calendar', () => {
  it('navigates months accessibly and reports a selected date', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <Calendar
        mode="single"
        defaultMonth={new Date(2025, 0, 1)}
        onSelect={onSelect}
      />,
    );

    const nextButton = screen.getByRole('button', { name: /next month/i });
    const previousButton = screen.getByRole('button', {
      name: /previous month/i,
    });
    expect(nextButton).toHaveClass(
      'pointer-events-auto',
      'size-7',
      'border',
      'bg-transparent',
      'opacity-50',
    );
    expect(previousButton).toHaveClass(
      'pointer-events-auto',
      'size-7',
      'border',
      'bg-transparent',
      'opacity-50',
    );
    expect(nextButton.parentElement).toHaveClass(
      'absolute',
      'inset-x-3',
      'top-3',
      'h-7',
      'pointer-events-none',
    );
    expect(container.firstElementChild).toHaveClass('relative', 'w-fit');

    fireEvent.click(nextButton);
    expect(screen.getByText('February 2025')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }));

    fireEvent.click(
      screen.getByRole('button', { name: /january 15th, 2025/i }),
    );
    expect(onSelect).toHaveBeenCalledWith(
      new Date(2025, 0, 15),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
