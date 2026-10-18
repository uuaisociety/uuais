import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AboutPage from "@/components/pages/AboutPage";
import { defaultAppState } from "@/__tests__/helpers/fixtures";

jest.mock("@/utils/seo", () => ({
  updatePageMeta: jest.fn(),
}));

const mockUseApp = jest.fn();
jest.mock("@/contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const renderWith = (state: typeof defaultAppState) => {
  mockUseApp.mockReturnValue({ state, dispatch: jest.fn() });
  return render(<AboutPage />);
};

describe("AboutPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page heading and description", () => {
    renderWith(defaultAppState);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "About us.",
    );
    expect(
      screen.getByText(/We are a community of students/),
    ).toBeInTheDocument();
  });

  it("calls updatePageMeta on mount", () => {
    const { updatePageMeta } = jest.requireMock("@/utils/seo");
    renderWith(defaultAppState);
    expect(updatePageMeta).toHaveBeenCalledWith(
      "About Us",
      expect.stringContaining("mission"),
    );
  });

  it("renders mission and vision in the mission section", () => {
    renderWith(defaultAppState);
    const section = screen.getByRole("region", { name: /mission and vision/i });
    expect(within(section).getByText("Mission")).toBeInTheDocument();
    expect(
      within(section).getByText(/To democratize AI education/),
    ).toBeInTheDocument();
    expect(within(section).getByText("Vision")).toBeInTheDocument();
    expect(
      within(section).getByText(/A student-led non-profit/),
    ).toBeInTheDocument();
  });

  it("renders team section heading", () => {
    renderWith(defaultAppState);
    expect(
      screen.getByRole("heading", { name: /our team/i }),
    ).toBeInTheDocument();
  });

  it("places the year history after FAQ and before the join invitation", () => {
    renderWith(defaultAppState);
    const history = screen.getByRole("region", {
      name: "History of UU AI Society",
    });
    const faq = screen.getByRole("region", {
      name: "Frequently asked questions",
    });
    const join = screen.getByRole("region", { name: "Join UU AI Society" });
    expect(
      faq.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      history.compareDocumentPosition(join) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(history).getByRole("heading", { name: "(Our) history" }),
    ).toBeInTheDocument();
    const foundingPanel = within(history).getByRole("article", {
      name: "2025 history",
    });
    expect(within(foundingPanel).getByText("2025", { selector: "p" })).toBeInTheDocument();
    expect(
      within(foundingPanel).getByRole("heading", {
        name: "A student society takes shape",
      }),
    ).toBeInTheDocument();
    expect(
      within(foundingPanel).getByText(/Founded in April 2025/),
    ).toBeInTheDocument();
    expect(
      within(history).getByRole("img", { name: "Uppsala University campus" }),
    ).toBeInTheDocument();
    expect(
      within(history).getByRole("button", { name: "2025" }),
    ).toHaveAttribute("aria-pressed", "true");
    const yearNavigation = within(history).getByRole("navigation", {
      name: "History by year",
    });
    const photo = within(history).getByRole("img", {
      name: "Uppsala University campus",
    });
    const summary = within(history).getByText(/Founded in April 2025/);
    expect(yearNavigation.compareDocumentPosition(photo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(photo.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("switches the year summary and image with the year rail", async () => {
    const user = userEvent.setup();
    renderWith(defaultAppState);
    const history = screen.getByRole("region", {
      name: "History of UU AI Society",
    });
    const photo = within(history).getByRole("img", {
      name: "Uppsala University campus",
    });
    await user.click(within(history).getByRole("button", { name: "2026" }));
    const currentPanel = within(history).getByRole("article", {
      name: "2026 history",
    });
    expect(
      within(currentPanel).getByRole("heading", {
        name: "Building, recognition, and community",
      }),
    ).toBeInTheDocument();
    expect(
      within(currentPanel).getByText(/National AI Startup Competition round was announced/),
    ).toBeInTheDocument();
    expect(within(history).getByRole("img", { name: "Uppsala University campus" })).toBe(photo);
    expect(within(history).queryByRole("article", { name: "2025 history" })).not.toBeInTheDocument();
    expect(within(history).queryByRole("link", { name: "Anders Wall Foundation" })).not.toBeInTheDocument();
    expect(within(history).getByRole("button", { name: "2026" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(currentPanel).getByRole("link", { name: "Uppsala University" })).toHaveAttribute(
      "href",
      "https://www.uu.se/en/news/2026/2026-09-09-alexander-sundquist-is-named-uppsala-student-of-the-year-2026",
    );
    expect(within(currentPanel).getByRole("link", { name: "UU AI Society" })).toHaveAttribute(
      "href",
      "https://www.uuais.com/events/OgJIGnOVGOiAXhvEHUIP",
    );
  });

  it("uses previous and next controls without wrapping", async () => {
    const user = userEvent.setup();
    renderWith(defaultAppState);
    const history = screen.getByRole("region", {
      name: "History of UU AI Society",
    });
    const previous = within(history).getByRole("button", {
      name: "Previous year",
    });
    const next = within(history).getByRole("button", { name: "Next year" });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    await user.click(next);
    expect(within(history).getByText("2026", { selector: "p" })).toBeInTheDocument();
    expect(next).toBeDisabled();
    expect(previous).toBeEnabled();
    await user.click(previous);
    expect(
      within(within(history).getByRole("article", { name: "2025 history" })).getByText(
        "2025",
        { selector: "p" },
      ),
    ).toBeInTheDocument();
    expect(previous).toBeDisabled();
    await user.click(next);
    await user.click(previous);
    expect(
      within(history).getByRole("heading", { name: "A student society takes shape" }),
    ).toBeInTheDocument();
  });

  it("supports keyboard selection of a year", async () => {
    const user = userEvent.setup();
    renderWith(defaultAppState);
    const history = screen.getByRole("region", {
      name: "History of UU AI Society",
    });
    const yearButton = within(history).getByRole("button", { name: "2026" });
    yearButton.focus();
    expect(yearButton).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      within(history).getByRole("heading", {
        name: "Building, recognition, and community",
      }),
    ).toBeInTheDocument();
  });

  it("links every section in the on-page nav", () => {
    renderWith(defaultAppState);
    const nav = screen.getByRole("navigation", { name: "On this page" });
    const links = [
      ["Mission", "#mission"],
      ["Team", "#team"],
      ["Contact", "#contact"],
      ["FAQ", "#faq"],
      ["History", "#history"],
    ];
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(links.map(([label]) => label));
    for (const [label, href] of links) {
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }
  });

  it("renders every contact address in the contact section", () => {
    renderWith(defaultAppState);
    const section = screen.getByRole("region", { name: /touch/i });
    for (const [label, email] of [
      ["General", "contact@uuais.com"],
      ["Website", "it@uuais.com"],
      ["Partnerships", "partnerships@uuais.com"],
      ["Development", "dev@uuais.com"],
      ["Research", "research@uuais.com"],
    ]) {
      expect(within(section).getByText(label)).toBeInTheDocument();
      // The whole card is the mailto target, so the address sits inside the anchor.
      expect(within(section).getByText(email).closest("a")).toHaveAttribute(
        "href",
        `mailto:${email}`,
      );
    }
  });

  it("renders FAQ section heading even without FAQs", () => {
    renderWith(defaultAppState);
    expect(
      screen.getByRole("heading", { name: /asked questions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Questions aren't loading right now/),
    ).toBeInTheDocument();
  });

  it("renders FAQ items sorted by order", () => {
    renderWith({
      ...defaultAppState,
      faqs: [
        {
          id: "2",
          question: "Second?",
          answer: "Second answer.",
          category: "general",
          order: 2,
          published: true,
        },
        {
          id: "1",
          question: "First?",
          answer: "First answer.",
          category: "general",
          order: 1,
          published: true,
        },
        {
          id: "3",
          question: "Third?",
          answer: "Third answer.",
          category: "general",
          order: 3,
          published: true,
        },
      ],
    });
    const questions = screen.getAllByRole("term");
    expect(questions[0]).toHaveTextContent("First?");
    expect(questions[1]).toHaveTextContent("Second?");
    expect(questions[2]).toHaveTextContent("Third?");
  });

  it("filters out unpublished FAQs", () => {
    renderWith({
      ...defaultAppState,
      faqs: [
        {
          id: "1",
          question: "Published?",
          answer: "Yes.",
          category: "general",
          order: 1,
          published: true,
        },
        {
          id: "2",
          question: "Hidden?",
          answer: "No.",
          category: "general",
          order: 2,
          published: false,
        },
      ],
    });
    expect(screen.getByText("Published?")).toBeInTheDocument();
    expect(screen.queryByText("Hidden?")).not.toBeInTheDocument();
  });

  it("converts email addresses in FAQ answers to mailto links", () => {
    renderWith({
      ...defaultAppState,
      faqs: [
        {
          id: "1",
          question: "Contact?",
          answer: "Email us at hello@uuais.com for help.",
          category: "general",
          order: 1,
          published: true,
        },
      ],
    });
    const link = screen.getByText("hello@uuais.com");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "mailto:hello@uuais.com");
  });

  it("does not crash when FAQ answer has no email", () => {
    renderWith({
      ...defaultAppState,
      faqs: [
        {
          id: "1",
          question: "General?",
          answer: "Plain text answer.",
          category: "general",
          order: 1,
          published: true,
        },
      ],
    });
    expect(screen.getByText("Plain text answer.")).toBeInTheDocument();
  });
});
