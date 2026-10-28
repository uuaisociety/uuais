// partnerAccounts/{email} is keyed by the lowercased, trimmed address, so the
// allowlist matches however the provider capitalises a sign-in email.
export const partnerEmailKey = (email: string): string =>
  email.trim().toLowerCase();
