const getRuntimeBase = () => {
  if (typeof window !== 'undefined' && window.__API_URL) {
    return window.__API_URL;
  }
  return undefined;
};

const rawBaseUrl = getRuntimeBase() || import.meta.env.VITE_API_URL || '';
const API_BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : '';

export const getApiBaseUrl = () => API_BASE_URL;

export const resolveApiUrl = (path = '') => {
  if (!API_BASE_URL) {
    return path;
  }
  if (!path) {
    return API_BASE_URL;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const resolveWebSocketUrl = (path = '/api/socket') => {
  if (API_BASE_URL) {
    const url = new URL(path, API_BASE_URL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  }
  const url = new URL(path, window.location.origin);
  url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
};

const shouldPrefix = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return API_BASE_URL && url.startsWith(window.location.origin);
  }
  return url.startsWith('/');
};

const withPrefixedUrl = (url) => {
  if (!API_BASE_URL) {
    return url;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.startsWith(window.location.origin)) {
      return API_BASE_URL + url.substring(window.location.origin.length);
    }
    return url;
  }
  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
};

export const patchGlobalFetch = () => {
  if (typeof window === 'undefined' || !window.fetch || !API_BASE_URL || window.__API_FETCH_PATCHED__) {
    return;
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    let newInput = input;
    if (typeof input === 'string' && shouldPrefix(input)) {
      newInput = withPrefixedUrl(input);
    } else if (input instanceof Request && shouldPrefix(input.url)) {
      const newUrl = withPrefixedUrl(input.url);
      newInput = new Request(newUrl, input);
    }
    return originalFetch(newInput, init);
  };
  window.__API_FETCH_PATCHED__ = true;
};

