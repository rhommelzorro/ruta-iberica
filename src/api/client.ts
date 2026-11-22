import * as SecureStore from 'expo-secure-store';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

export type ApiError = { error: string; details?: string[] };

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('access_token');
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync('access_token', token);
  } else {
    await SecureStore.deleteItemAsync('access_token');
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw { error: 'Sin conexión con el servidor. Compruebe la red y EXPO_PUBLIC_API_URL.' } as ApiError;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data || {}) as ApiError & { message?: string };
    const details = Array.isArray(err.details) ? err.details.filter(Boolean) : [];
    const msg =
      details.length > 0
        ? details.join('\n')
        : err.error || err.message || `Error HTTP ${res.status}`;
    throw { ...err, error: msg, details } as ApiError;
  }
  return data as T;
}

export { API_URL };
