import type { MapRoute } from './mapRoutes';
import { formatKm } from '../utils/geo';

function placeLine(route: MapRoute): string {
  return [route.locality, route.province, route.ccaa, route.country].filter(Boolean).join(', ');
}

/** Texto individual para la ficha. Prioriza description de fuente; si falta, lo compone. */
export function routeNarrative(route: MapRoute): { lead: string; body: string; bullets: string[] } {
  const tipo = route.vp_subtype_label || route.route_type.replace(/_/g, ' ');
  const lugar = placeLine(route);
  const lead =
    route.summary ||
    `${route.name} · ${tipo}${lugar ? ` · ${lugar}` : ''}`;

  if (route.description && route.description.length > 40) {
    return {
      lead,
      body: route.description,
      bullets: buildBullets(route),
    };
  }

  const parts: string[] = [];
  parts.push(
    `${route.name} es un trazado de tipo «${tipo}» situado en ${lugar || 'ubicación desconocida'}.`,
  );
  if (route.length_m != null) {
    parts.push(`Longitud aproximada del tramo publicado: ${formatKm(route.length_m)}.`);
  } else {
    parts.push('Longitud: desconocida (no figura en la fuente).');
  }
  if (route.provider === 'rgvp' || route.source_code === 'miteco_rgvp') {
    parts.push(
      'Procede de la Red General de Vías Pecuarias (MITECO). Distinga el trazado publicado del estado físico actual y de los usos permitidos.',
    );
  } else if (route.provider === 'osm') {
    parts.push(
      'Datos comunitarios de OpenStreetMap (ODbL). No equivalen necesariamente a una homologación oficial.',
    );
  }
  if (route.usage_notes) {
    parts.push(route.usage_notes);
  }
  if (route.is_demo) {
    parts.push('Marcada como demostración: no interpreta cobertura completa del territorio.');
  }
  parts.push(
    'Desnivel, dificultad y aptitud ciclista solo se muestran si la fuente los aporta; en caso contrario aparecen como desconocidos.',
  );

  return {
    lead,
    body: parts.join(' '),
    bullets: buildBullets(route),
  };
}

function buildBullets(route: MapRoute): string[] {
  const place = placeLine(route);
  return [
    `Tipo: ${route.vp_subtype_label || route.route_type}`,
    `Lugar: ${place || 'desconocido'}`,
    `Longitud: ${formatKm(route.length_m)}`,
    `Desnivel: ${route.elevation_gain_m == null ? 'desconocido' : `${route.elevation_gain_m} m`}`,
    `Dificultad: ${route.difficulty || 'desconocido'}`,
    `Superficie: ${route.surface || 'desconocido'}`,
    `Peatonal: ${route.allows_walking == null ? 'desconocido' : route.allows_walking ? 'sí' : 'no'}`,
    `Ciclista: ${route.allows_cycling == null ? 'desconocido' : route.allows_cycling ? 'sí' : 'no'}`,
    `Estado físico: ${route.physical_status || 'desconocido'}`,
    `Fuente: ${route.source_name || route.provider}`,
  ];
}
