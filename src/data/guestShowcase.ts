import type { MapRoute } from './mapRoutes';

/**
 * Rutas de muestra para invitados (sin sesión).
 * Ideadas para abrir el apetito: variedad ES/PT, a pie y bici.
 * Tras registrarse se muestra el catálogo completo.
 */
export const GUEST_SHOWCASE_IDS: string[] = [
  'cat-ast-oso',
  'cat-pv-plazaola',
  'cat-can-pas',
  'cat-and-aceite',
  'cat-cat-carrilet-olot',
  'cat-mad-tajuna',
  'cat-gal-camino',
  'cat-pt-douro',
  'cat-mur-noroeste',
  'cat-ext-vegas',
  'osm-pack-madrid-anillo',
  'local-es-vp-madrid',
];

const GUEST_MAX = 8;

/** Semilla estable por día → la muestra cambia un poco sin ser caótica. */
function daySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function pickDiverse(routes: MapRoute[], max: number): MapRoute[] {
  const byId = new Map(routes.map((r) => [r.id, r]));
  const preferred = GUEST_SHOWCASE_IDS.map((id) => byId.get(id)).filter(Boolean) as MapRoute[];
  const rest = routes.filter((r) => !GUEST_SHOWCASE_IDS.includes(r.id));
  const seed = daySeed();
  // Mezcla ligera del resto para que no siempre se vean las mismas extras
  const shuffled = [...rest].sort((a, b) => {
    const ha = (a.id.charCodeAt(0) * 31 + seed) % 997;
    const hb = (b.id.charCodeAt(0) * 31 + seed) % 997;
    return ha - hb;
  });
  const out: MapRoute[] = [];
  const seen = new Set<string>();
  for (const r of [...preferred, ...shuffled]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Invitados: pocas rutas de ejemplo.
 * Usuarios con sesión: catálogo completo (sin tocar).
 */
export function applyGuestRouteLimit(routes: MapRoute[], isAuthenticated: boolean): MapRoute[] {
  if (isAuthenticated) return routes;
  if (routes.length <= GUEST_MAX) return routes;
  return pickDiverse(routes, GUEST_MAX);
}

export const GUEST_TEASER =
  'Vista previa: unas pocas rutas de ejemplo. Cree una cuenta gratis para el catálogo completo (vías verdes, pecuarias, OSM…).';
