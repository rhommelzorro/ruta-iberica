import { api } from './client';

export async function listComments(routeId: number) {
  return api<{ items: any[]; note: string }>(`/api/routes/${routeId}/comments`, { auth: false });
}

export async function createComment(routeId: number, body: string) {
  return api(`/api/routes/${routeId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function editComment(id: number, body: string) {
  return api(`/api/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
}

export async function deleteComment(id: number) {
  return api(`/api/comments/${id}`, { method: 'DELETE' });
}

export async function listAlerts(routeId: number) {
  return api<{ items: any[]; note: string }>(`/api/routes/${routeId}/alerts`, { auth: false });
}

export async function createAlert(
  routeId: number,
  payload: { alert_type: string; body: string; observed_at: string },
) {
  return api(`/api/routes/${routeId}/alerts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function addFavorite(routeId: number) {
  return api(`/api/favorites/${routeId}`, { method: 'POST' });
}

export async function removeFavorite(routeId: number) {
  return api(`/api/favorites/${routeId}`, { method: 'DELETE' });
}

export async function listFavorites() {
  return api<{ items: any[] }>('/api/favorites');
}

export async function reportContent(target_type: 'comment' | 'alert', target_id: number, reason: string) {
  return api('/api/reports', {
    method: 'POST',
    body: JSON.stringify({ target_type, target_id, reason }),
  });
}
