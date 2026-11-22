"""Extrae vías pecuarias RGVP (EPSG:25830 → WGS84) para Levante, Zaragoza y entorno."""
from __future__ import annotations

import json
import os
from collections import Counter, defaultdict
from pathlib import Path

from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(os.environ.get("RGVP_SRC", str(ROOT / "data/samples/rgvp_tmp/extracted/RGVP_BDN_2024.geojson")))
OUT_JSON = ROOT / "assets/routes/vias_pecuarias_rgvp.json"
OUT_GEO = ROOT / "assets/routes/vias_pecuarias_rgvp.geojson"

# El GeoJSON oficial declara urn:ogc:def:crs:EPSG::25830 para todo el fichero.
TRANSFORM = Transformer.from_crs(25830, 4326, always_xy=True)

TIPO = {
    "CA": ("canada", "Cañada"),
    "COR": ("cordel", "Cordel"),
    "CO": ("cordel", "Cordel"),
    "VE": ("vereda", "Vereda"),
    "LA": ("colada", "Colada"),
    "OV": ("otra_via_pecuaria", "Otra vía pecuaria"),
}

# Prioridad: Levante + Zaragoza / Aragón este
PRIORITY = {
    "castellón",
    "castellon",
    "valencia",
    "alicante",
    "alacant",
    "murcia",
    "albacete",
    "tarragona",
    "barcelona",
    "girona",
    "lleida",
    "teruel",
    "cuenca",
    "zaragoza",
    "huesca",
}

# Cupo por provincia (más rutas donde pediste)
PROV_CAP = {
    "castellón": 24,
    "castellon": 24,
    "murcia": 28,
    "albacete": 24,
    "valencia": 20,
    "alicante": 22,
    "alacant": 22,
    "tarragona": 18,
    "barcelona": 16,
    "girona": 12,
    "lleida": 16,
    "teruel": 16,
    "cuenca": 12,
    "zaragoza": 28,
    "huesca": 12,
}
DEFAULT_CAP = 8

ESTADO = {
    "1": "clasificada",
    "2": "deslinde pendiente o estado documental intermedio",
    "3": "otras situaciones documentales",
}

# Península ibérica (sin Atlántico abierto ni Mediterráneo abierto)
IBERIA = (-9.55, 35.95, 3.35, 43.85)


def to_wgs84(x: float, y: float) -> tuple[float, float] | None:
    lon, lat = TRANSFORM.transform(x, y)
    lon_f, lat_f = float(lon), float(lat)
    if not (IBERIA[0] <= lon_f <= IBERIA[2] and IBERIA[1] <= lat_f <= IBERIA[3]):
        return None
    return lon_f, lat_f


def simplify_coords(coords, step=3):
    if len(coords) <= 10:
        return coords
    out = coords[::step]
    if out[-1] != coords[-1]:
        out.append(coords[-1])
    if len(out) > 140:
        step2 = max(1, len(out) // 120)
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
    return simplify_coords(max(lines, key=len))


def is_priority(prov: str) -> bool:
    p = (prov or "").lower()
    return any(k in p for k in PRIORITY)


def prov_cap(prov: str) -> int:
    p = (prov or "").lower()
    for k, cap in PROV_CAP.items():
        if k in p:
            return cap
    return DEFAULT_CAP


def geometry_ok(wgs: list[list[float]]) -> bool:
    if len(wgs) < 2:
        return False
    lons = [c[0] for c in wgs]
    lats = [c[1] for c in wgs]
    # Descartar trazados que se van al mar/Atlántico o se estiran de forma absurda
    if min(lons) < IBERIA[0] or max(lons) > IBERIA[2]:
        return False
    if min(lats) < IBERIA[1] or max(lats) > IBERIA[3]:
        return False
    if (max(lons) - min(lons)) > 4.5 or (max(lats) - min(lats)) > 3.5:
        return False
    return True


def build_story(props: dict, subtype_label: str, length_m: float | None) -> str:
    name = props.get("nb_via") or "Vía pecuaria sin nombre"
    prov = props.get("PRO_N_INE") or "provincia desconocida"
    muni = props.get("NOMBRE") or prov
    ccaa = props.get("NUT2_NOM") or "comunidad autónoma desconocida"
    est = ESTADO.get(str(props.get("cd_est_vp") or ""), "estado documental desconocido")
    km = (
        f"{length_m / 1000:.1f} km"
        if length_m and length_m >= 1000
        else (f"{int(length_m)} m" if length_m else "longitud desconocida")
    )
    tip = subtype_label.lower()
    intro = {
        "Cañada": (
            f"La {name} es una {tip} del inventario RGVP en {muni} ({prov}, {ccaa}). "
            f"Las cañadas son las vías pecuarias de mayor anchura tradicional; este tramo "
            f"figura con unos {km} en la cartografía oficial."
        ),
        "Cordel": (
            f"{name} aparece catalogada como {tip} en {muni} ({prov}). "
            f"Los cordeles conectaban normalmente cañadas y veredas; el trazado publicado "
            f"cubre aproximadamente {km}."
        ),
        "Vereda": (
            f"{name} es una {tip} documentada en {muni}, provincia de {prov} ({ccaa}). "
            f"Las veredas suelen ser vías de menor anchura que cañadas y cordeles. "
            f"Longitud del tramo en la fuente: {km}."
        ),
        "Colada": (
            f"{name} figura como {tip} en el municipio de {muni} ({prov}). "
            f"Las coladas son pasos pecuarios de anchura variable. Tramo publicado: {km}."
        ),
    }.get(
        subtype_label,
        f"{name} es una vía pecuaria ({subtype_label}) en {muni} ({prov}, {ccaa}), "
        f"con unos {km} según la RGVP.",
    )
    mid = (
        f" Forma parte de la Red General de Vías Pecuarias (actualización 2024). "
        f"Estado documental indicado en la fuente: {est}."
    )
    caveats = (
        " No se inventan desnivel, dificultad ni permisos de circulación: "
        "la aptitud ciclista o peatonal actual debe comprobarse in situ y en normativa local. "
        "El trazado mostrado es el publicado; el estado físico puede diferir."
    )
    return intro + mid + caveats


def feature_from_raw(f: dict) -> dict | None:
    props = f.get("properties") or {}
    code = props.get("cd_tipo_vp")
    if code not in TIPO:
        return None
    subtype, label = TIPO[code]
    coords = to_linestring(f["geometry"])
    if not coords or len(coords) < 2:
        return None
    wgs: list[list[float]] = []
    for c in coords:
        pt = to_wgs84(float(c[0]), float(c[1]))
        if pt:
            wgs.append([pt[0], pt[1]])
    if not geometry_ok(wgs):
        return None
    length = props.get("nm_long")
    length_f = float(length) if length is not None else None
    name = props.get("nb_via") or f"{label} sin nombre"
    display = name if label.lower() in name.lower() else f"{label}: {name}"
    story = build_story(props, label, length_f)
    return {
        "type": "Feature",
        "properties": {
            "id": f"rgvp-{props.get('id_cod_vp')}",
            "external_id": str(props.get("id_cod_vp")),
            "name": display,
            "country": "ES",
            "locality": props.get("NOMBRE") or props.get("PRO_N_INE"),
            "route_type": "via_pecuaria",
            "vp_subtype": subtype,
            "vp_subtype_label": label,
            "allows_walking": True,
            "allows_cycling": None,
            "length_m": length_f,
            "difficulty": None,
            "elevation_gain_m": None,
            "surface": None,
            "physical_status": "desconocido",
            "usage_notes": (
                "Vía pecuaria clasificada (RGVP). Aptitud ciclista: desconocida. "
                "Verificar estado y permisos locales."
            ),
            "description": story,
            "summary": story.split(".")[0] + ".",
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
            "province": props.get("PRO_N_INE"),
            "ccaa": props.get("NUT2_NOM"),
        },
        "geometry": {"type": "LineString", "coordinates": wgs},
    }


def main():
    print("Cargando RGVP (EPSG:25830)...")
    data = json.loads(SRC.read_text(encoding="utf-8"))
    crs = (data.get("crs") or {}).get("properties", {}).get("name", "")
    print("crs fuente:", crs)

    by_key: dict[tuple[str, str], list] = defaultdict(list)
    for f in data["features"]:
        props = f.get("properties") or {}
        prov = props.get("PRO_N_INE") or ""
        if not is_priority(prov):
            continue
        code = props.get("cd_tipo_vp")
        if code not in TIPO:
            continue
        by_key[(prov, code)].append(f)

    selected = []
    for (prov, _code), items in sorted(by_key.items()):
        items = sorted(
            items,
            key=lambda x: float((x.get("properties") or {}).get("nm_long") or 0),
            reverse=True,
        )
        cap = prov_cap(prov)
        # reparte cupo entre tipos: hasta cap total por provincia en el agregador más abajo
        selected.extend(items[: max(6, cap // 3)])

    features = []
    counts_tipo = Counter()
    counts_prov = Counter()
    skipped_geom = 0
    for f in selected:
        props = f.get("properties") or {}
        prov = props.get("PRO_N_INE") or "?"
        code = props.get("cd_tipo_vp")
        if counts_prov[prov] >= prov_cap(prov):
            continue
        if counts_tipo[code] >= 120:
            continue
        feat = feature_from_raw(f)
        if not feat:
            skipped_geom += 1
            continue
        features.append(feat)
        counts_tipo[code] += 1
        counts_prov[prov] += 1

    features.sort(
        key=lambda f: (
            0 if is_priority(f["properties"].get("province") or "") else 1,
            -(f["properties"].get("length_m") or 0),
        )
    )

    fc = {
        "type": "FeatureCollection",
        "crs_note": "Geometrías transformadas desde EPSG:25830 (CRS declarado en RGVP_BDN_2024).",
        "attribution": (
            "Fuente: © Ministerio para la Transición Ecológica y el Reto Demográfico. "
            "RGVP 2024. Muestra Levante, Zaragoza y entorno; no es cobertura completa."
        ),
        "features": features,
    }
    text = json.dumps(fc, ensure_ascii=False)
    OUT_JSON.write_text(text, encoding="utf-8")
    OUT_GEO.write_text(text, encoding="utf-8")

    # QA
    seaish = 0
    for feat in features:
        for lon, lat in feat["geometry"]["coordinates"]:
            if lon < -9.4 or lon > 3.3 or lat < 36.0 or lat > 43.8:
                seaish += 1
                break
    print(
        "total",
        len(features),
        "skipped_geom",
        skipped_geom,
        "seaish",
        seaish,
        "bytes",
        OUT_JSON.stat().st_size,
    )
    print("provincias", dict(counts_prov.most_common()))
    print("tipos", dict(counts_tipo))


if __name__ == "__main__":
    main()
