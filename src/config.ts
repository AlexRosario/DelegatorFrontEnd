// Single source of truth for the backend base URL.
// Local dev uses the default; set VITE_API_URL in the environment to point at a
// deployed backend when going live — that's the only change needed.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
