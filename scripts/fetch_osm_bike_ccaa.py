"""Descarga rutas ciclistas OSM por CCAA / regiones PT y refuerza osm_iberia.json."""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_JSON = ROOT / "assets" / "routes" / "osm_iberia.json"
OUT_GEO = ROOT / "assets" / "routes" / "osm_iberia.geojson"

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# (lat_min, lon_min, lat_max, lon_max, ccaa_label, country)
ZONES = [
    (36.0, -7.6, 38.8, -1.5, "Andalucía", "ES"),
    (40.0, -2.2, 42.9, 0.8, "Aragón", "ES"),
    (42.8, -7.3, 43.7, -4.5, "Principado de Asturias", "ES"),
    (42.7, -4.9, 43.6, -3.1, "Cantabria", "ES"),
    (40.0, -7.1, 43.3, -1.7, "Castilla y León", "ES"),
    (38.0, -5.5, 41.4, -0.8, "Castilla-La Mancha", "ES"),
    (40.4, 0.0, 42.9, 3.4, "Cataluña", "ES"),
    (37.8, -1.6, 40.9, 0.7, "Comunitat Valenciana", "ES"),
    (37.9, -7.6, 40.6, -4.6, "Extremadura", "ES"),
    (41.7, -9.4, 43.8, -6.7, "Galicia", "ES"),
    (39.85, -4.6, 41.2, -3.0, "Comunidad de Madrid", "ES"),
    (37.3, -2.4, 38.8, -0.6, "Región de Murcia", "ES"),
    (41.8, -2.6, 43.4, -0.7, "Comunidad Foral de Navarra", "ES"),
    (42.8, -3.5, 43.5, -1.7, "País Vasco", "ES"),
    (41.9, -3.2, 42.7, -1.7, "La Rioja", "ES"),
    (36.8, -9.6, 42.2, -6.1, "Portugal", "PT"),
]


def query_zone(lat1, lon1, lat2, lon2) -> str:
    # Límite bajo + named routes: Overpass se cuelga con bbox grandes.
    return f"""
[out:json][timeout:45];
(
  rel["type"="route"]["route"="bicycle"]["name"]({lat1},{lon1},{lat2},{lon2});
  rel["type"="route"]["route"="mtb"]["name"]({lat1},{lon1},{lat2},{lon2});
  rel["cycle_network"="ES:Vías Verdes"]({lat1},{lon1},{lat2},{lon2});
);
out tags geom 25;
""".strip()


def fetch(ql: str) -> dict:
    data = urllib.parse.urlencode({"data": ql}).encode()
    last = None
    for ep in ENDPOINTS:
        req = urllib.request.Request(
            ep,
            data=data,
            headers={"User-Agent": "RutaIberica/1.0 (bike-pack)", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=75) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            print("  fail", ep, e)
            time.sleep(2)
    raise RuntimeError(last)


def simplify(coords: list[list[float]], step: int = 4) -> list[list[float]]:
    if len(coords) <= 12:
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


def element_coords(el: dict) -> list[list[float]]:
    coords: list[list[float]] = []
    if el.get("geometry"):
        coords = [[p["lon"], p["lat"]] for p in el["geometry"] if "lon" in p and "lat" in p]
    if len(coords) < 2:
        for m in el.get("members") or []:
            for p in m.get("geometry") or []:
                if "lon" in p and "lat" in p:
                    coords.append([p["lon"], p["lat"]])
    return simplify(coords)


def guess_province(lon: float, lat: float, ccaa: str) -> str | None:
    # Aprox. centroides; solo etiqueta legible
    return ccaa


def to_feature(el: dict, ccaa: str, country: str) -> dict | None:
    tags = el.get("tags") or {}
    coords = element_coords(el)
    if len(coords) < 2:
        return None
    route = tags.get("route") or ("bicycle" if tags.get("highway") == "cycleway" else "bicycle")
    name = tags.get("name") or tags.get("name:es") or tags.get("ref") or f"Ruta ciclista OSM {el.get('id')}"
    network = tags.get("cycle_network") or tags.get("network") or ""
    is_vv = "vía" in network.lower() or "via" in network.lower() or "verde" in name.lower()
    mid = coords[len(coords) // 2]
    eid = f"osm-bike-{el.get('type', 'rel')}-{el.get('id')}"
    story = (
        f"{name} es una ruta ciclista documentada en OpenStreetMap"
        f"{' (red de Vías Verdes / similar)' if is_vv else ''} "
        f"en {ccaa} ({country}). Longitud y estado físico pueden variar; datos ODbL."
    )
    return {
        "type": "Feature",
        "properties": {
            "id": eid,
            "osm_id": el.get("id"),
            "name": name,
            "route": "bicycle" if route == "bicycle" else route,
            "route_type": "via_verde" if is_vv else ("otra" if route == "bicycle" else "sendero"),
            "allows_cycling": True,
            "allows_walking": True if is_vv or route != "mtb" else None,
            "country": country,
            "locality": tags.get("loc_name") or ccaa,
            "province": guess_province(mid[0], mid[1], ccaa),
            "ccaa": ccaa,
            "summary": story.split(".")[0] + ".",
            "description": story,
            "surface": tags.get("surface"),
            "source_code": "osm_overpass",
            "source_name": "OpenStreetMap — route=bicycle|mtb|Vías Verdes (ODbL)",
            "attribution": "© colaboradores de OpenStreetMap (ODbL)",
            "license_name": "ODbL 1.0",
            "source_link": f"https://www.openstreetmap.org/{el.get('type', 'relation')}/{el.get('id')}",
            "is_demo": False,
            "official": False,
        },
        "geometry": {"type": "LineString", "coordinates": coords},
    }


def main():
    existing: list[dict] = []
    if OUT_JSON.exists():
        existing = json.loads(OUT_JSON.read_text(encoding="utf-8")).get("features") or []
    by_id = {f["properties"]["id"]: f for f in existing if f.get("properties", {}).get("id")}

    added = 0
    for lat1, lon1, lat2, lon2, ccaa, country in ZONES:
        print("zona", ccaa, "...")
        try:
            data = fetch(query_zone(lat1, lon1, lat2, lon2))
        except Exception as e:  # noqa: BLE001
            print("  SKIP", e)
            continue
        els = data.get("elements") or []
        print("  elements", len(els))
        # Prefer named bicycle relations
        scored = []
        for el in els:
            tags = el.get("tags") or {}
            score = 0
            if el.get("type") == "relation":
                score += 5
            if tags.get("route") in ("bicycle", "mtb"):
                score += 3
            if tags.get("name"):
                score += 2
            if "Vías Verdes" in (tags.get("cycle_network") or ""):
                score += 4
            scored.append((score, el))
        scored.sort(key=lambda x: -x[0])
        taken = 0
        for _score, el in scored:
            if taken >= 18:
                break
            feat = to_feature(el, ccaa, country)
            if not feat:
                continue
            fid = feat["properties"]["id"]
            if fid not in by_id:
                added += 1
            by_id[fid] = feat
            taken += 1
        time.sleep(1.5)

    features = list(by_id.values())
    fc = {
        "type": "FeatureCollection",
        "attribution": (
            "© OpenStreetMap contributors (ODbL). Rutas bicycle/mtb y Vías Verdes; "
            "no necesariamente oficiales. Refuerzo por CCAA para Ruta Ibérica."
        ),
        "features": features,
    }
    text = json.dumps(fc, ensure_ascii=False)
    OUT_JSON.write_text(text, encoding="utf-8")
    OUT_GEO.write_text(text, encoding="utf-8")
    bike = sum(1 for f in features if f["properties"].get("allows_cycling") is True)
    print("total", len(features), "nuevas", added, "bikeTrue", bike, "bytes", OUT_JSON.stat().st_size)


if __name__ == "__main__":
    main()
