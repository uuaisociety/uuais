// Build a /login URL that redirects back to the current page after sign-in.
export const loginUrl = (pathname: string, search?: string): string => {
  const target = `${pathname}${search ? `?${search}` : ""}`;
  const safe =
    target.startsWith("/") &&
    !target.startsWith("//") &&
    target !== "/login";
  return safe ? `/login?redirect=${encodeURIComponent(target)}` : "/login";
};
