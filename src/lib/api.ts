/**
 * Utility to get the base API URL.
 * In development, it's usually empty (relative to origin).
 * In production, if VITE_API_URL is provided, use it.
 */
export const getApiUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};
