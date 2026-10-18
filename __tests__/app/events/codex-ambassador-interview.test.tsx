import { render, screen, within } from '@testing-library/react';
import InterviewPage, {
  metadata,
} from '@/app/events/codex-ambassador-interview/page';

describe('Codex ambassador interview page', () => {
  it('renders all five questions, the three tips, and all original resource links', () => {
    render(<InterviewPage />);

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5);
    expect(
      screen.getByText(/How did you become a Codex Ambassador/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Which DevDay announcement/)).toBeInTheDocument();
    expect(
      screen.getByText(/Which skills should students focus on/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/What are your top three tips/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Where can people keep learning/),
    ).toBeInTheDocument();

    const tips = screen.getByRole('list');
    expect(within(tips).getAllByRole('listitem')).toHaveLength(3);
    expect(
      within(tips).getByText(/Give useful, “lagom” context/),
    ).toBeInTheDocument();
    expect(
      within(tips).getByText(/Use goal-driven development/),
    ).toBeInTheDocument();
    expect(
      within(tips).getByText(/Verify with automation and human review/),
    ).toBeInTheDocument();

    const expectedLinks = [
      'https://learn.chatgpt.com/docs/whats-new/devday-2026#reusable-cloud-environments',
      'https://developers.openai.com/api/docs/guides/decisions',
      'https://learn.chatgpt.com/docs/sites?surface=app#bring-user-data-to-your-site-with-plugins',
      'https://learn.chatgpt.com/docs/computer-use',
      'https://chatgpt.com/features/voice',
      'https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex',
      'https://learn.chatgpt.com/docs/automations',
      'https://learn.chatgpt.com/docs/enterprise/teams',
      'https://www.linkedin.com/company/codex-community-sweden/',
      'https://developers.openai.com/learn/codex',
      'https://www.linkedin.com/in/shuangzheng/',
      'https://luma.com/codex-community',
      'https://www.linkedin.com/company/uu-ai-society/',
    ];
    for (const href of expectedLinks) {
      expect(document.querySelector(`a[href="${href}"]`)).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole('link', { name: 'Back to Events' }),
    ).toHaveLength(2);
  });

  it('declares a canonical URL and descriptive page metadata', () => {
    expect(metadata.title).toBe('Interview with the Codex Ambassador');
    expect(metadata.alternates?.canonical).toMatch(
      /\/events\/codex-ambassador-interview$/,
    );
  });

  it('uses the supplied portrait and event photos with descriptive alternatives', () => {
    render(<InterviewPage />);

    expect(
      screen.getByRole('img', {
        name: 'Shuang Zheng wearing a Codex Build Crew shirt',
      }),
    ).toHaveAttribute('width', '1200');
    expect(
      screen.getByRole('img', {
        name: /beside Codex and UU AI Society banners/,
      }),
    ).toHaveAttribute('height', '1200');
    expect(
      screen.getByRole('img', {
        name: /standing together in a lecture room with flowers/,
      }),
    ).toHaveAttribute('height', '1200');
  });
});
