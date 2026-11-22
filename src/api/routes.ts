import { api } from './client';

export type RouteListItem = {
  id: number;
  name: string;
  country: string;
  locality?: string | null;
  route_type: string;
  difficulty: string;
  length_m?: number | null;
  elevation_gain_m?: number | null;
  allows_walking?: boolean | null;
  allows_cycling?: boolean | null;
  start_lat?: number | null;
  start_lon?: number | null;
  bbox: { min_lon: number; min_lat: number; max_lon: number; max_lat: number };
  geometry_simplified: GeoJSON.Geometry | string | null;
  is_demo: boolean;
  distance_to_start_m?: number;
  travel_distance_m?: number | null;
  travel_distance_note?: string;
};

export type RouteDetail = RouteListItem & {
  description?: string | null;
  surface: string;
  usage_notes?: string | null;
  restrictions?: string | null;
  physical_status: string;
  official_info?: string | null;
  geometry_detail: GeoJSON.Geometry | null;
  license_name?: string | null;
  attribution?: string | null;
  source_link?: string | null;
  source_updated_at?: string | null;
  source?: {
    code: string;
    name: string;
    attribution?: string | null;
    source_url?: string | null;
    connector_status?: string;
  } | null;
};

export type BBox = { min_lon: number; min_lat: number; max_lon: number; max_lat: number };

export type RouteFilters = {
  country?: string;
  route_type?: string;
  difficulty?: string;
  min_length_m?: number;
  max_length_m?: number;
  allows_walking?: boolean;
  allows_cycling?: boolean;
  q?: string;
  near_lat?: number;
  near_lon?: number;
  page?: number;
  per_page?: number;
};

export async function fetchRoutes(bbox: BBox, filters: RouteFilters = {}) {
  const params = new URLSearchParams({
    min_lon: String(bbox.min_lon),
    min_lat: String(bbox.min_lat),
    max_lon: String(bbox.max_lon),
    max_lat: String(bbox.max_lat),
    page: String(filters.page || 1),
    per_page: String(filters.per_page || 30),
  });
  (['country', 'route_type', 'difficulty', 'q'] as const).forEach((k) => {
    const v = filters[k];
    if (v) params.set(k, String(v));
  });
  if (filters.min_length_m != null) params.set('min_length_m', String(filters.min_length_m));
  if (filters.max_length_m != null) params.set('max_length_m', String(filters.max_length_m));
  if (filters.allows_walking) params.set('allows_walking', 'true');
  if (filters.allows_cycling) params.set('allows_cycling', 'true');
  if (filters.near_lat != null && filters.near_lon != null) {
    params.set('near_lat', String(filters.near_lat));
    params.set('near_lon', String(filters.near_lon));
  }
  return api<{ items: RouteListItem[]; total: number; page: number; pages: number }>(
    `/api/routes?${params}`,
    { auth: false },
  );
}

export async function fetchRoute(id: number) {
  return api<RouteDetail>(`/api/routes/${id}`, { auth: false });
}

export async function fetchAccess(id: number, userLat?: number, userLon?: number) {
  const params = new URLSearchParams();
  if (userLat != null && userLon != null) {
    params.set('user_lat', String(userLat));
    params.set('user_lon', String(userLon));
  }
  const q = params.toString() ? `?${params}` : '';
  return api<{
    start: { lat: number; lon: number };
    straight_line_distance_m: number | null;
    travel_distance_m: null;
    travel_distance_note: string;
    navigation: { google_maps: string; geo_uri: string; apple_maps: string };
    note: string;
  }>(`/api/routes/${id}/access${q}`, { auth: false });
}
