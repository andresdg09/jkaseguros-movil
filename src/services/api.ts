export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';

export class ApiError extends Error {}

async function request(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifica tu conexión.');
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError((data && data.error) || `Error del servidor (${res.status}).`);
  }
  return data;
}

export const api = {
  get: (path: string, token?: string | null) => request(path, { method: 'GET' }, token),
  post: (path: string, body?: unknown, token?: string | null) =>
    request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, token),
  put: (path: string, body?: unknown, token?: string | null) =>
    request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }, token),
};
