import { api, setToken } from './client';

export type PublicUser = {
  id: number;
  public_name: string;
  email_verified: boolean;
  created_at?: string | null;
  is_moderator?: boolean;
  email?: string;
};

export async function register(payload: {
  email: string;
  password: string;
  password_confirm: string;
  public_name?: string;
  accept_terms?: boolean;
}) {
  return api<{
    user: PublicUser;
    message: string;
    access_token?: string;
    token_type?: string;
    email_verification?: { required: boolean };
  }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
  });
}

export async function login(email: string, password: string) {
  const data = await api<{
    access_token: string;
    user: PublicUser;
    email_verified: boolean;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  await setToken(data.access_token);
  return data;
}

export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } finally {
    await setToken(null);
  }
}

export async function me() {
  return api<PublicUser>('/api/auth/me');
}

export async function updateProfile(public_name: string) {
  return api<PublicUser>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ public_name }),
  });
}

export async function verifyEmail(token: string) {
  return api<{ ok: boolean; message: string }>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
    auth: false,
  });
}

export async function forgotPassword(email: string) {
  return api<{ message: string; mail: { sent: boolean; message: string }; dev_token?: string }>(
    '/api/auth/forgot-password',
    { method: 'POST', body: JSON.stringify({ email }), auth: false },
  );
}

export async function resetPassword(token: string, password: string, password_confirm: string) {
  return api<{ ok: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password, password_confirm }),
    auth: false,
  });
}

export async function deleteAccount() {
  return api<{ ok: boolean; message: string }>('/api/auth/me', {
    method: 'DELETE',
    body: JSON.stringify({ confirm: 'ELIMINAR' }),
  });
}
