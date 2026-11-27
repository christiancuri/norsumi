export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  /** In-memory fake backend for development and screenshots. */
  mock: import.meta.env.VITE_MOCK === '1',
  version: __APP_VERSION__,
  githubUrl: 'https://github.com/christiancuri/norsumi',
  androidUrl:
    'https://github.com/christiancuri/norsumi/releases/latest/download/norsumi.apk',
} as const;
