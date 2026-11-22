"""Extrae muestra de la RGVP (MITECO) para la app: cañadas, cordeles, veredas, coladas."""
from __future__ import annotations

import json
import os
from collections import Counter, defaultdict
from pathlib import Path

from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(os.environ.get("RGVP_SRC", str(ROOT / "data/samples/rgvp_tmp/extracted/RGVP_BDN_2024.geojson")))
OUT = ROOT / "assets/routes/vias_pecuarias_rgvp.geojson"

# El GeoJSON oficial viene en proyectado UTM ETRS89 (zonas 29/30/31).
_TRANSFORMERS = {
    29: Transformer.from_crs(25829, 4326, always_xy=True),
    30: Transformer.from_crs(25830, 4326, always_xy=True),
    31: Transformer.from_crs(25831, 4326, always_xy=True),
}


def to_wgs84(x: float, y: float) -> tuple[float, float] | None:
    """Prueba zonas UTM 29–31 y elige la que cae en la península."""
    best = None
    for zone, tr in _TRANSFORMERS.items():
        lon, lat = tr.transform(x, y)
        if -10.5 <= lon <= 4.5 and 35.5 <= lat <= 44.2:
            return float(lon), float(lat)
        best = (float(lon), float(lat))
    return best

TIPO = {
    "CA": ("canada", "Cañada"),
    "COR": ("cordel", "Cordel"),
    "CO": ("cordel", "Cordel"),
    "VE": ("vereda", "Vereda"),
    "LA": ("colada", "Colada"),
    "OV": ("otra_via_pecuaria", "Otra vía pecuaria"),
}


def simplify_coords(coords, step=4):
    if len(coords) <= 8:
        return coords
    out = coords[::step]
    if out[-1] != coords[-1]:
        out.append(coords[-1])
    if len(out) > 120:
        step2 = max(1, len(out) // 100)
        out = out[::step2]
        if out[-1] != coords[-1]:
            out.append(coords[-1])
    return out


def to_linestring(geom):
    if geom["type"] == "LineString":
        return simplify_coords(geom["coordinates"])
    lines = geom.get("coordinates") or []
    if not lines:
        return None
    best = max(lines, key=len)
    return simplify_coords(best)


def main():
    print("Cargando RGVP...")
    data = json.loads(SRC.read_text(encoding="utf-8"))
    features = data["features"]
    print("total", len(features))

    by_key = defaultdict(list)
    for f in features:
        props = f.get("properties") or {}
        code = props.get("cd_tipo_vp")
        if code not in TIPO:
            continue
        geom = f.get("geometry") or {}
        if geom.get("type") not in ("LineString", "MultiLineString"):
            continue
        prov = props.get("PRO_N_INE") or props.get("NOMBRE") or "ES"
        by_key[(prov, code)].append(f)

    selected = []
    for (_prov, _code), items in sorted(by_key.items()):
        items = sorted(
            items,
            key=lambda x: float((x.get("properties") or {}).get("nm_long") or 0),
            reverse=True,
        )
        selected.extend(items[:3])

    counts = Counter()
    final = []
    for f in selected:
        code = (f.get("properties") or {}).get("cd_tipo_vp")
        if counts[code] >= 45:
            continue
        counts[code] += 1
        final.append(f)
        if len(final) >= 180:
            break

    print("seleccionadas", len(final), dict(counts))

    out_features = []
    skipped = 0
    for f in final:
        props = f.get("properties") or {}
        code = props.get("cd_tipo_vp")
        subtype, label = TIPO[code]
        coords = to_linestring(f["geometry"])
        if not coords or len(coords) < 2:
            skipped += 1
            continue
        wgs = []
        for c in coords:
            pt = to_wgs84(float(c[0]), float(c[1]))
            if pt:
                wgs.append([pt[0], pt[1]])
        if len(wgs) < 2:
            skipped += 1
            continue
        name = props.get("nb_via") or f"{label} sin nombre"
        length = props.get("nm_long")
        out_features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": f"rgvp-{props.get('id_cod_vp')}",
                    "external_id": str(props.get("id_cod_vp")),
                    "name": f"{label}: {name}" if label.lower() not in name.lower() else name,
                    "country": "ES",
                    "locality": props.get("NOMBRE") or props.get("PRO_N_INE"),
                    "route_type": "via_pecuaria",
                    "vp_subtype": subtype,
                    "vp_subtype_label": label,
                    "allows_walking": True,
                    "allows_cycling": None,
                    "length_m": float(length) if length is not None else None,
                    "difficulty": None,
                    "elevation_gain_m": None,
                    "surface": None,
                    "physical_status": "desconocido",
                    "usage_notes": (
                        "Vía pecuaria clasificada (RGVP). Aptitud ciclista: desconocida. "
                        "Verificar estado y permisos locales."
                    ),
                    "description": (
                        f"{label}. Provincia: {props.get('PRO_N_INE') or 'desconocida'}. "
                        f"CCAA: {props.get('NUT2_NOM') or 'desconocida'}."
                    ),
                    "source_code": "miteco_rgvp",
                    "source_name": "Red General de Vías Pecuarias (MITECO)",
                    "attribution": (
                        "Fuente: © Ministerio para la Transición Ecológica y el Reto Demográfico"
                    ),
                    "license_name": "Reutilización información sector público (MITECO)",
                    "source_link": (
                        "https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/"
                        "biodiversidad/vias_pecuarias.html"
                    ),
                    "source_updated_at": "2024-12-31",
                    "is_demo": False,
                    "official": True,
                    "cd_tipo_vp": code,
                    "cd_est_vp": props.get("cd_est_vp"),
                },
                "geometry": {"type": "LineString", "coordinates": wgs},
            }
        )
    print("omitidas", skipped)

    fc = {
        "type": "FeatureCollection",
        "attribution": (
            "Fuente: © Ministerio para la Transición Ecológica y el Reto Demográfico. "
            "RGVP 2024. Muestra reducida para la app; no es la cobertura completa."
        ),
        "features": out_features,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print("escrito", OUT, "features", len(out_features), "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
