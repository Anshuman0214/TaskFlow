// Access tokens live in memory only (never localStorage) — the refresh
// token is the persistent credential, and it's an HTTP-only cookie the
// backend controls, so nothing here needs to survive a page reload.
let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};
