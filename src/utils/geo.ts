import type { Region } from 'react-native-maps';
import type { BBox } from '../api/routes';

export function regionToBBox(region: Region): BBox {
  const halfLat = region.latitudeDelta / 2;
  const halfLon = region.longitudeDelta / 2;
  return {
    min_lat: region.latitude - halfLat,
    max_lat: region.latitude + halfLat,
    min_lon: region.longitude - halfLon,
    max_lon: region.longitude + halfLon,
  };
}

export function coordsFromGeometry(
  geom: GeoJSON.Geometry | string | null | undefined,
): { latitude: number; longitude: number }[] {
  if (!geom) return [];
  const g = typeof geom === 'string' ? (JSON.parse(geom) as GeoJSON.Geometry) : geom;
  const out: { latitude: number; longitude: number }[] = [];
  const push = (c: number[]) => out.push({ longitude: c[0], latitude: c[1] });
  if (g.type === 'LineString') {
    (g.coordinates as number[][]).forEach(push);
  } else if (g.type === 'MultiLineString') {
    (g.coordinates as number[][][]).forEach((line) => line.forEach(push));
  }
  return out;
}

export function formatKm(meters?: number | null): string {
  if (meters == null) return 'desconocido';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlmb = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dlmb / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export const IBERIA_REGION: Region = {
  latitude: 40.0,
  longitude: -3.5,
  latitudeDelta: 12,
  longitudeDelta: 14,
};
