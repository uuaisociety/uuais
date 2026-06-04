import { renderHook, act, render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('vanilla-cookieconsent', () => ({
  run: jest.fn(),
}));

jest.mock(
  'vanilla-cookieconsent/dist/cookieconsent.css',
  () => ({}),
  { virtual: true },
);

import * as CookieConsent from 'vanilla-cookieconsent';
import { CookieConsentProvider, useCookieConsent } from '@/contexts/CookieConsentContext';

const mockRun = CookieConsent.run as jest.Mock;

interface CookieConfig {
  mode: string;
  categories: Record<string, { enabled: boolean; readOnly?: boolean }>;
  onChange?: (data: { cookie: { categories: string[] } }) => void;
  onConsent?: (data: { cookie: { categories: string[] } }) => void;
}

describe('CookieConsentContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state when used outside provider', () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current).toEqual({
      analytics: false,
      necessary: true,
      loaded: false,
    });
  });

  it('calls CookieConsent.run once on mount', () => {
    renderHook(() => useCookieConsent(), {
      wrapper: CookieConsentProvider,
    });
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('does not call CookieConsent.run twice on re-render', () => {
    const { rerender } = renderHook(() => useCookieConsent(), {
      wrapper: CookieConsentProvider,
    });
    rerender();
    rerender();
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('passes correct config to CookieConsent.run', () => {
    renderHook(() => useCookieConsent(), {
      wrapper: CookieConsentProvider,
    });
    const config = mockRun.mock.calls[0][0] as CookieConfig;
    expect(config.mode).toBe('opt-in');
    expect(config.categories.necessary).toEqual({ enabled: true, readOnly: true });
    expect(config.categories.analytics).toEqual({ enabled: false });
    expect(typeof config.onChange).toBe('function');
    expect(typeof config.onConsent).toBe('function');
  });

  it('updates state when onChange fires with analytics consent', () => {
    const { result } = renderHook(() => useCookieConsent(), {
      wrapper: CookieConsentProvider,
    });
    const config = mockRun.mock.calls[0][0] as CookieConfig;
    act(() => {
      config.onChange!({ cookie: { categories: ['analytics', 'necessary'] } });
    });
    expect(result.current).toEqual({
      analytics: true,
      necessary: true,
      loaded: true,
    });
  });

  it('updates state when onChange fires without analytics consent', () => {
    const { result } = renderHook(() => useCookieConsent(), {
      wrapper: CookieConsentProvider,
    });
    const config = mockRun.mock.calls[0][0] as CookieConfig;
    act(() => {
      config.onChange!({ cookie: { categories: ['necessary'] } });
    });
    expect(result.current).toEqual({
      analytics: false,
      necessary: true,
      loaded: true,
    });
  });

  it('updates state when onConsent fires with analytics consent', () => {
    const { result } = renderHook(() => useCookieConsent(), {
      wrapper: CookieConsentProvider,
    });
    const config = mockRun.mock.calls[0][0] as CookieConfig;
    act(() => {
      config.onConsent!({ cookie: { categories: ['analytics', 'necessary'] } });
    });
    expect(result.current).toEqual({
      analytics: true,
      necessary: true,
      loaded: true,
    });
  });

  it('updates state when onConsent fires without analytics consent', () => {
    const { result } = renderHook(() => useCookieConsent(), {
      wrapper: CookieConsentProvider,
    });
    const config = mockRun.mock.calls[0][0] as CookieConfig;
    act(() => {
      config.onConsent!({ cookie: { categories: [] } });
    });
    expect(result.current).toEqual({
      analytics: false,
      necessary: true,
      loaded: true,
    });
  });

  it('renders children', () => {
    render(
      <CookieConsentProvider>
        <div data-testid="child">Hello</div>
      </CookieConsentProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('exposes callbacks from the mock for external testing', () => {
    renderHook(() => useCookieConsent(), {
      wrapper: CookieConsentProvider,
    });
    const config = mockRun.mock.calls[0][0] as CookieConfig;
    expect(config.onChange).toBeDefined();
    expect(config.onConsent).toBeDefined();
  });
});
