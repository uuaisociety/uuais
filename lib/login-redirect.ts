// Redirect plumbing shared by /login and /join so signing in mid-task lands the user back where they started.

/** Local paths only (no open redirects, incl. //evil.com); /login and /join would loop a signed-in user. */
export const safeRedirect = (target: string | null | undefined): string | null =>
  target &&
  target.startsWith("/") &&
  !target.startsWith("//") &&
  target !== "/login" &&
  target !== "/join"
    ? target
    : null;

// Build a /login URL that redirects back to the current page after sign-in.
export const loginUrl = (pathname: string, search?: string): string => {
  const target = safeRedirect(`${pathname}${search ? `?${search}` : ""}`);
  return target ? `/login?redirect=${encodeURIComponent(target)}` : "/login";
};

// Keeps a pending redirect, so an account created mid-application returns to the form, not /account.
export const joinUrl = (redirect: string | null | undefined): string => {
  const target = safeRedirect(redirect);
  return target ? `/join?redirect=${encodeURIComponent(target)}` : "/join";
};

/** The validated `redirect` param of the current URL (null on the server). */
export const currentRedirect = (): string | null =>
  typeof window === "undefined"
    ? null
    : safeRedirect(new URLSearchParams(window.location.search).get("redirect"));
