// Normaliza la URL base: si EXPO_PUBLIC_API_URL viene sin el sufijo /api (como pasó
// en eas.json, causando 404 en todas las requests del APK), lo agregamos igual.
function normalizeApiUrl(url: string) {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api');

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

// Igual que request(), pero para endpoints que devuelven un archivo binario (ej. el PDF
// de la cotización) en lugar de JSON.
async function requestBytes(path: string, options: RequestInit = {}, token?: string | null) {
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

  if (!res.ok) {
    let message = `Error del servidor (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // La respuesta de error no era JSON; usamos el mensaje genérico.
    }
    throw new ApiError(message);
  }

  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

export const api = {
  get: (path: string, token?: string | null) => request(path, { method: 'GET' }, token),
  post: (path: string, body?: unknown, token?: string | null) =>
    request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, token),
  put: (path: string, body?: unknown, token?: string | null) =>
    request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }, token),
  postForBytes: (path: string, body?: unknown, token?: string | null) =>
    requestBytes(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, token),
};
