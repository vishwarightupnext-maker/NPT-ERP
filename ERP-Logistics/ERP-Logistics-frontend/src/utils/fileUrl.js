// Static file uploads are served from the API host without the /api prefix.
const FILE_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export const fileHref = (p) => (p ? `${FILE_BASE}${p}` : '');
