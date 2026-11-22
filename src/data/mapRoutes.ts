import type { BBox } from '../api/routes';
import { haversineM } from '../utils/geo';
import cicloviasCatalogo from '../../assets/routes/ciclovias_catalogo.json';
import fuentesLocales from '../../assets/routes/fuentes_locales.json';
import osmPack from '../../assets/routes/osm_iberia.json';
import viasPecuarias from '../../assets/routes/vias_pecuarias_rgvp.json';

export type MapRoute = {
  id: string;
  name: string;
  country: string;
  locality?: string | null;
  route_type: string;
  vp_subtype?: string | null;
  vp_subtype_label?: string | null;
  difficulty: string;
  length_m?: number | null;
  elevation_gain_m?: number | null;
  allows_walking?: boolean | null;
  allows_cycling?: boolean | null;
  start_lat?: number | null;
  start_lon?: number | null;
  end_lat?: number | null;
  end_lon?: number | null;
  geometry: { latitude: number; longitude: number }[];
  description?: string | null;
  summary?: string | null;
  province?: string | null;
  ccaa?: string | null;
  surface?: string | null;
  usage_notes?: string | null;
  physical_status?: string | null;
  restrictions?: string | null;
  official_info?: string | null;
  attribution?: string | null;
  license_name?: string | null;
  source_link?: string | null;
  source_name?: string | null;
  source_code?: string | null;
  source_updated_at?: string | null;
  is_demo: boolean;
  is_official: boolean;
  provider: 'local' | 'osm' | 'rgvp';
  distance_to_start_m?: number;
};

export type MapFilters = {
  country?: string;
  q?: string;
  usage?: 'all' | 'walk' | 'bike';
  route_type?: string;
  near_lat?: number;
  near_lon?: number;
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function lineLengthM(coords: { latitude: number; longitude: number }[]): number | null {
  if (coords.length < 2) return null;
  let t = 0;
  for (let i = 1; i < coords.length; i++) {
    t += haversineM(
      coords[i - 1].latitude,
      coords[i - 1].longitude,
      coords[i].latitude,
      coords[i].longitude,
    );
  }
  return t;
}

function featureToRoute(f: any, provider: 'local' | 'osm' | 'rgvp'): MapRoute | null {
  const g = f.geometry;
  if (!g) return null;
  const props = f.properties || {};
  const geometry: { latitude: number; longitude: number }[] = [];
  if (g.type === 'LineString') {
    for (const c of g.coordinates || []) geometry.push({ longitude: c[0], latitude: c[1] });
  } else if (g.type === 'MultiLineString') {
    for (const line of g.coordinates || []) {
      for (const c of line) geometry.push({ longitude: c[0], latitude: c[1] });
    }
  } else return null;
  if (geometry.length < 2) return null;

  const start = geometry[0];
  const end = geometry[geometry.length - 1];
  const routeTag = props.route as string | undefined;
  const routeType =
    props.route_type ||
    (routeTag === 'mtb'
      ? 'sendero'
      : routeTag === 'bicycle'
        ? 'otra'
        : routeTag === 'hiking' || routeTag === 'foot'
          ? 'sendero'
          : props.route_type || 'otra');

  let allows_walking: boolean | null = props.allows_walking ?? null;
  let allows_cycling: boolean | null = props.allows_cycling ?? null;
  if (provider === 'osm') {
    if (routeTag === 'hiking' || routeTag === 'foot') allows_walking = true;
    if (routeTag === 'bicycle' || routeTag === 'mtb') allows_cycling = true;
  }

  return {
    id: String(props.id || f.id || `${provider}-${start.longitude}-${start.latitude}`),
    name: String(props.name || props.ref || 'Ruta sin nombre'),
    country: String(props.country || guessCountry(start.longitude, start.latitude)),
    locality: props.locality || props.place || null,
    route_type: String(routeType),
    vp_subtype: props.vp_subtype || null,
    vp_subtype_label: props.vp_subtype_label || null,
    difficulty: props.difficulty || 'desconocido',
    length_m: props.length_m ?? lineLengthM(geometry),
    elevation_gain_m: props.elevation_gain_m ?? null,
    allows_walking,
    allows_cycling,
    start_lat: start.latitude,
    start_lon: start.longitude,
    end_lat: end.latitude,
    end_lon: end.longitude,
    geometry,
    description: props.description || null,
    summary: props.summary || null,
    province: props.province || null,
    ccaa: props.ccaa || null,
    surface: props.surface || null,
    usage_notes: props.usage_notes || null,
    physical_status: props.physical_status || 'desconocido',
    restrictions: props.restrictions || null,
    official_info: props.official_info || null,
    attribution:
      props.attribution ||
      (provider === 'osm'
        ? '© colaboradores de OpenStreetMap (ODbL). Datos comunitarios, no necesariamente oficiales.'
        : null),
    license_name: props.license_name || (provider === 'osm' ? 'ODbL 1.0' : null),
    source_link:
      props.source_link ||
      (provider === 'osm' && props.osm_id
        ? `https://www.openstreetmap.org/relation/${props.osm_id}`
        : provider === 'osm'
          ? 'https://www.openstreetmap.org/copyright'
          : null),
    source_name:
      props.source_name ||
      (provider === 'osm' ? 'OpenStreetMap — route=hiking|bicycle|mtb|foot' : null),
    source_code: props.source_code || (provider === 'osm' ? 'osm_overpass' : 'local'),
    source_updated_at: props.source_updated_at || null,
    is_demo: Boolean(props.is_demo),
    is_official: Boolean(props.official),
    provider,
  };
}

function guessCountry(lon: number, lat: number): string {
  if (lon < -6.9 && lat > 36.8 && lat < 42.2) return 'PT';
  return 'ES';
}

function inBBox(route: MapRoute, bbox: BBox): boolean {
  return route.geometry.some(
    (p) =>
      p.longitude >= bbox.min_lon &&
      p.longitude <= bbox.max_lon &&
      p.latitude >= bbox.min_lat &&
      p.latitude <= bbox.max_lat,
  );
}

function applyFilters(routes: MapRoute[], filters: MapFilters): MapRoute[] {
  let out = routes;
  if (filters.country) out = out.filter((r) => r.country === filters.country);
  if (filters.route_type) {
    out = out.filter((r) => r.route_type === filters.route_type);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    // Alias cortos → texto que suele venir en ccaa / provincia / localidad
    const aliases: Record<string, string[]> = {
      andalucía: ['andalucía', 'andalucia', 'jaén', 'jaen', 'córdoba', 'cordoba', 'sevilla', 'cádiz', 'cadiz', 'huelva', 'granada', 'almería', 'almeria', 'málaga', 'malaga'],
      aragón: ['aragón', 'aragon', 'teruel', 'huesca', 'zaragoza'],
      asturias: [
        'asturias',
        'principado de asturias',
        'gijón',
        'gijon',
        'oviedo',
        'mieres',
        'llanes',
        'senda del oso',
        'camocha',
        'aviles',
        'avilés',
      ],
      cantabria: [
        'cantabria',
        'santander',
        'castro',
        'liebana',
        'liébana',
        'besaya',
        'suances',
        'potes',
        'lebaniego',
      ],
      'castilla y león': ['castilla y león', 'castilla y leon', 'burgos', 'león', 'leon', 'salamanca', 'segovia', 'palencia', 'zamora', 'ávila', 'avila', 'soria', 'valladolid'],
      'castilla-la mancha': ['castilla-la mancha', 'castilla la mancha', 'albacete', 'toledo', 'ciudad real', 'cuenca', 'guadalajara'],
      cataluña: ['cataluña', 'catalunya', 'girona', 'gerona', 'tarragona', 'barcelona', 'lleida', 'lérida'],
      galicia: ['galicia', 'a coruña', 'coruña', 'pontevedra', 'lugo', 'ourense', 'santiago', 'vigo'],
      'comunidad de madrid': ['comunidad de madrid', 'madrid'],
      'región de murcia': ['región de murcia', 'region de murcia', 'murcia', 'cartagena', 'caravaca'],
      'comunitat valenciana': ['comunitat valenciana', 'valenciana', 'valencia', 'alicante', 'castellón', 'castellon', 'benicàssim', 'benicasim'],
      extremadura: ['extremadura', 'cáceres', 'caceres', 'badajoz', 'plasencia'],
      navarra: ['navarra', 'comunidad foral de navarra', 'estella', 'tudela'],
      'país vasco': [
        'país vasco',
        'pais vasco',
        'euskadi',
        'araba',
        'álava',
        'alava',
        'vizcaya',
        'bizkaia',
        'guipúzcoa',
        'guipuzcoa',
        'gipuzkoa',
        'vitoria',
        'gasteiz',
        'donostia',
        'bilbao',
        'urola',
        'plazaola',
        'bidasoa',
        'izki',
      ],
      'la rioja': ['la rioja', 'rioja', 'logroño', 'logrono', 'calahorra', 'ezcaray'],
      portugal: ['portugal', 'lisboa', 'porto', 'faro', 'évora', 'evora', 'coimbra', 'setúbal', 'setubal', 'sintra', 'aveiro', 'algarve', 'douro'],
    };
    const terms = aliases[q] || [q];
    out = out.filter((r) => {
      const hay = [
        r.name,
        r.locality,
        r.province,
        r.ccaa,
        r.summary,
        r.route_type,
        r.vp_subtype_label,
        r.vp_subtype,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.some((t) => hay.includes(t));
    });
  }
  if (filters.usage === 'walk') {
    // A pie: peatonales, senderos y vías pecuarias. Fuera las solo-ciclistas.
    out = out.filter((r) => {
      if (r.allows_cycling === true && r.allows_walking === false) return false;
      if (r.allows_walking === true) return true;
      if (r.route_type === 'via_pecuaria' || r.route_type === 'sendero') return true;
      if (r.allows_walking == null && r.allows_cycling !== true) return true;
      return false;
    });
  }
  if (filters.usage === 'bike') {
    // En bici: solo ciclistas / vías verdes / ecopistas (no mezclar con todas las pecuarias,
    // si no «A pie» y «En bici» se ven iguales al filtrar por comunidad).
    out = out.filter((r) => {
      if (r.allows_cycling === true) return true;
      if (r.allows_cycling === false) return false;
      if (r.route_type === 'via_verde' || r.route_type === 'ecopista') return true;
      return false;
    });
  }
  if (filters.near_lat != null && filters.near_lon != null) {
    out = out
      .map((r) => ({
        ...r,
        distance_to_start_m:
          r.start_lat != null && r.start_lon != null
            ? Math.round(haversineM(filters.near_lat!, filters.near_lon!, r.start_lat, r.start_lon))
            : undefined,
      }))
      .sort((a, b) => (a.distance_to_start_m ?? 1e12) - (b.distance_to_start_m ?? 1e12));
  }
  return out;
}

function featuresToRoutes(features: any[], provider: 'local' | 'osm' | 'rgvp'): MapRoute[] {
  return features.map((f) => featureToRoute(f, provider)).filter(Boolean) as MapRoute[];
}

export function loadLocalRoutes(bbox: BBox, filters: MapFilters = {}): MapRoute[] {
  const demo = featuresToRoutes((fuentesLocales as any).features || [], 'local');
  const ciclovias = featuresToRoutes((cicloviasCatalogo as any).features || [], 'local');
  const packed = featuresToRoutes((osmPack as any).features || [], 'osm');
  const rgvp = featuresToRoutes((viasPecuarias as any).features || [], 'rgvp');
  // Ciclovías primero en fusión por id: cobertura bici por CCAA.
  const all = [...ciclovias, ...rgvp, ...demo, ...packed];
  return applyFilters(
    all.filter((r) => inBBox(r, bbox)),
    filters,
  );
}

function overpassGeomToCoords(geom: { lat: number; lon: number }[] | undefined) {
  if (!geom?.length) return [] as { latitude: number; longitude: number }[];
  return geom.map((p) => ({ latitude: p.lat, longitude: p.lon }));
}

/** Zoom regional: permite consultas Overpass en vivo. */
export function shouldQueryOverpass(bbox: BBox): boolean {
  const dLon = bbox.max_lon - bbox.min_lon;
  const dLat = bbox.max_lat - bbox.min_lat;
  return dLon <= 2.5 && dLat <= 2.0;
}

export async function fetchOsmRoutes(bbox: BBox, filters: MapFilters = {}): Promise<MapRoute[]> {
  if (!shouldQueryOverpass(bbox)) return [];

  const { min_lat, min_lon, max_lat, max_lon } = bbox;
  const query = `
[out:json][timeout:35];
(
  rel["route"="hiking"](${min_lat},${min_lon},${max_lat},${max_lon});
  rel["route"="foot"](${min_lat},${min_lon},${max_lat},${max_lon});
  rel["route"="bicycle"](${min_lat},${min_lon},${max_lat},${max_lon});
  rel["route"="mtb"](${min_lat},${min_lon},${max_lat},${max_lon});
);
out geom tags 80;
`.trim();

  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      const data = await res.json();
      const routes: MapRoute[] = [];
      for (const el of data.elements || []) {
        if (el.type !== 'relation') continue;
        let geometry = overpassGeomToCoords(el.geometry);
        if (geometry.length < 2 && Array.isArray(el.members)) {
          geometry = [];
          for (const m of el.members) {
            if (m.geometry) geometry.push(...overpassGeomToCoords(m.geometry));
          }
        }
        if (geometry.length < 2) continue;
        if (geometry.length > 500) {
          geometry = [...geometry.filter((_, i) => i % 3 === 0), geometry[geometry.length - 1]];
        }
        const tags = el.tags || {};
        const feature = {
          id: `osm-rel-${el.id}`,
          properties: {
            id: `osm-rel-${el.id}`,
            osm_id: el.id,
            name: tags.name || tags.ref || `Ruta OSM ${el.id}`,
            route: tags.route,
            is_demo: false,
            official: false,
            description: tags.description || null,
            surface: tags.surface || null,
          },
          geometry: {
            type: 'LineString',
            coordinates: geometry.map((p) => [p.longitude, p.latitude]),
          },
        };
        const route = featureToRoute(feature, 'osm');
        if (route) routes.push(route);
      }
      return applyFilters(routes, filters);
    } catch (e: any) {
      lastError = e;
    }
  }
  throw lastError || new Error('Overpass no disponible');
}

export async function loadMapRoutes(
  bbox: BBox,
  filters: MapFilters = {},
): Promise<{ routes: MapRoute[]; osmTried: boolean; osmError?: string; packed: number }> {
  const local = loadLocalRoutes(bbox, filters);
  let live: MapRoute[] = [];
  let osmTried = false;
  let osmError: string | undefined;
  if (shouldQueryOverpass(bbox)) {
    osmTried = true;
    try {
      live = await fetchOsmRoutes(bbox, filters);
    } catch (e: any) {
      osmError = e?.message || 'No se pudieron cargar rutas OSM en vivo.';
    }
  }
  const byId = new Map<string, MapRoute>();
  for (const r of [...local, ...live]) byId.set(r.id, r);
  // Reaplicar siempre (país / uso / tipo / texto) tras fusionar fuentes.
  const routes = applyFilters(Array.from(byId.values()), filters);
  return {
    routes,
    osmTried,
    osmError,
    packed:
      ((osmPack as any).features || []).length +
      ((cicloviasCatalogo as any).features || []).length,
  };
}
