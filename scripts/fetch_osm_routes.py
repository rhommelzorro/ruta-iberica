"""Descarga rutas OSM (ODbL) por zonas y genera GeoJSON para la app."""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "assets" / "routes" / "osm_iberia.geojson"
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# Cajas pequeñas (lat_min, lon_min, lat_max, lon_max, nombre)
BOXES = [
    (40.2, -3.95, 40.65, -3.45, "Madrid"),
    (41.25, 1.9, 41.55, 2.3, "Barcelona"),
    (39.35, -0.55, 39.6, -0.25, "Valencia"),
    (37.3, -6.1, 37.5, -5.85, "Sevilla"),
    (43.2, -6.0, 43.45, -5.7, "Asturias"),
    (42.8, -2.0, 43.05, -1.7, "Navarra"),
    (41.05, -8.75, 41.3, -8.45, "Porto"),
    (38.65, -9.3, 38.85, -9.05, "Lisboa"),
    (40.55, -8.75, 40.75, -8.5, "Aveiro"),
    (41.5, -8.5, 41.7, -8.25, "Braga"),
    (36.7, -4.55, 36.85, -4.35, "Malaga"),
    (42.2, -8.8, 42.35, -8.6, "Vigo"),
]


def query_box(lat1, lon1, lat2, lon2) -> str:
    return f"""
[out:json][timeout:50];
(
  rel["route"="bicycle"]({lat1},{lon1},{lat2},{lon2});
  rel["route"="hiking"]({lat1},{lon1},{lat2},{lon2});
  rel["route"="foot"]({lat1},{lon1},{lat2},{lon2});
  rel["route"="mtb"]({lat1},{lon1},{lat2},{lon2});
);
out tags geom 35;
""".strip()


def fetch(ql: str) -> dict:
    data = urllib.parse.urlencode({"data": ql}).encode()
    last = None
    for ep in ENDPOINTS:
        req = urllib.request.Request(
            ep,
            data=data,
            headers={"User-Agent": "RutaIberica/1.0 (local-dev)", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=70) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2)
    raise RuntimeError(last)


def relation_to_feature(el: dict) -> dict | None:
    tags = el.get("tags") or {}
    coords = []
    if el.get("geometry"):
        coords = [[p["lon"], p["lat"]] for p in el["geometry"]]
    if len(coords) < 2:
        for m in el.get("members") or []:
            for p in m.get("geometry") or []:
                coords.append([p["lon"], p["lat"]])
    if len(coords) < 2:
        return None
    # Simplificar: cada 3 puntos si es muy largo
    if len(coords) > 400:
        coords = coords[::3] + [coords[-1]]
    route = tags.get("route", "hiking")
    return {
        "type": "Feature",
        "properties": {
            "id": f"osm-rel-{el['id']}",
            "osm_id": el["id"],
            "name": tags.get("name") or tags.get("ref") or f"Ruta OSM {el['id']}",
            "route": route,
            "route_type": "sendero" if route in ("hiking", "foot", "mtb") else "otra",
            "network": tags.get("network"),
            "allows_walking": route in ("hiking", "foot") or None,
            "allows_cycling": route in ("bicycle", "mtb") or None,
            "is_demo": False,
            "official": False,
            "source_code": "osm_overpass",
            "source_name": "OpenStreetMap (ODbL)",
            "attribution": "© colaboradores de OpenStreetMap (ODbL)",
            "license_name": "ODbL 1.0",
            "source_link": f"https://www.openstreetmap.org/relation/{el['id']}",
        },
        "geometry": {"type": "LineString", "coordinates": coords},
    }


def main():
    seen = set()
    features = []
    for lat1, lon1, lat2, lon2, name in BOXES:
        print(f"zona {name}...", flush=True)
        try:
            data = fetch(query_box(lat1, lon1, lat2, lon2))
        except Exception as e:
            print(f"  FAIL {e}")
            continue
        n = 0
        for el in data.get("elements") or []:
            if el.get("type") != "relation" or el["id"] in seen:
                continue
            feat = relation_to_feature(el)
            if not feat:
                continue
            seen.add(el["id"])
            features.append(feat)
            n += 1
        print(f"  +{n} (total {len(features)})")
        time.sleep(1.5)

    fc = {
        "type": "FeatureCollection",
        "features": features,
        "attribution": "OpenStreetMap contributors, ODbL 1.0",
    }
    OUT.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print(f"Escrito {OUT} con {len(features)} rutas")


if __name__ == "__main__":
    main()
