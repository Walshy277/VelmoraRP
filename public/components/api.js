const apiBase = '';

export function getToken() {
  return localStorage.getItem('velmora_token') || null;
}

export async function api(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${apiBase}${path}`, opts);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}
