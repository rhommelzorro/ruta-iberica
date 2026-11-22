import type { MapRoute } from './mapRoutes';

const cache = new Map<string, MapRoute>();

export function putRoute(route: MapRoute) {
  cache.set(route.id, route);
}

export function putRoutes(routes: MapRoute[]) {
  for (const r of routes) cache.set(r.id, r);
}

export function getRoute(id: string): MapRoute | undefined {
  return cache.get(id);
}
