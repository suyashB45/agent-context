export function createApi(token, onUnauthorized = () => {}) {
  return async (path, options = {}) => {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(path, { ...options, headers, cache: 'no-store', credentials: 'omit', signal: options.signal || AbortSignal.timeout(15000) });
    let data;
    try { data = await response.json(); } catch { throw new Error('The server returned an unexpected response.'); }
    if (!response.ok) {
      if (response.status === 401) onUnauthorized();
      throw new Error(data.error || 'The request could not be completed.');
    }
    return data;
  };
}
