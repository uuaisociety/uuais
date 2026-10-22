import { render, screen } from '@testing-library/react';
import EventModal, {
  type EventFormState,
} from '@/components/pages/admin/modals/EventModal';
import { NotificationsProvider } from '@/components/ui/Notifications';

jest.mock('@/lib/firebase-client', () => ({ auth: {} }));
jest.mock('@/utils/fileUploader', () => ({
  uploadFileToServer: jest.fn(),
  deleteFileFromServer: jest.fn(),
}));

const form: EventFormState = {
  title: 'Test Event',
  description: 'A long description\nwith several lines',
  location: 'Room 101',
  image: '',
  category: 'workshop',
  registrationRequired: false,
  eventStartAt: '2030-06-15T18:00',
  registrationClosesAt: '',
  publishAt: '',
  externalRegistrationUrl: '',
  externalRegistrationMembersOnly: false,
};

describe('EventModal', () => {
  it('auto-resizes the description textarea to fit its contents', () => {
    jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(220);

    render(
      <NotificationsProvider>
        <EventModal
          open
          editing={false}
          form={form}
          setForm={jest.fn()}
          onClose={jest.fn()}
          onSubmit={jest.fn()}
        />
      </NotificationsProvider>,
    );

    const description = screen.getByRole('textbox', {
      name: /description/i,
    }) as HTMLTextAreaElement;

    expect(description).toHaveClass('overflow-y-hidden');
    expect(description.style.height).toBe('220px');

    jest.restoreAllMocks();
  });
});
