#!/usr/bin/env python3
"""
Scraper de directores y gerentes desde fuentes públicas (SMV / BVL).  [EXPERIMENTAL]

Objetivo: poblar `seed/seed_data.json` (bloques `personas` y `directorios`)
con los directorios y gerencias declarados por los emisores ante la SMV.

⚠️  Estado y limitaciones (probado el 2026-06-10):
  - https://www.smv.gob.pe devuelve 403 a tráfico automatizado / de centros de
    datos. Hay que correr esto desde una conexión doméstica EN EL PERÚ y con
    un User-Agent de navegador (mismo gotcha que otras fuentes .gob.pe).
  - El portal SMV es ASP.NET WebForms (__VIEWSTATE): si cambia el markup,
    ajustar los selectores en `parse_directorio()`.
  - Sé respetuoso: 1 request por emisor con pausa (RATE_SECONDS), cache local
    en `cache/` para no re-descargar.

Uso:
  .venv/bin/python scraper_directorios.py --listar          # lista emisores detectados
  .venv/bin/python scraper_directorios.py --emisor ALICORC1 # un emisor
  .venv/bin/python scraper_directorios.py --todo            # todos (lento)

Salida: out/directorios_scraped.json con el mismo esquema del seed:
  {"personas": [...], "directorios": [{"persona","empresa","rol","fuente"}]}
Luego se revisa A MANO y se mergea al seed (no automatizamos el merge para
mantener control editorial sobre qué entra al grafo).
"""
import argparse
import json
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache"
OUT = ROOT / "out" / "directorios_scraped.json"

RATE_SECONDS = 3.0
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

# Página pública de "Información de Emisores" de la SMV. El detalle por emisor
# expone la sección "Directorio y Gerencia" (memoria anual / datos generales).
SMV_BASE = "https://www.smv.gob.pe"
SMV_EMISORES = f"{SMV_BASE}/Frm_Empresas?data=COMPLETO"

ROL_MAP = [
    (re.compile(r"presidente", re.I), "presidente"),
    (re.compile(r"gerente\s+general|ceo", re.I), "gerente_general"),
    (re.compile(r"director|vicepresidente", re.I), "director"),
]


def slug(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")


def fetch(url: str, session: requests.Session) -> str:
    """GET con cache en disco y pausa de cortesía."""
    CACHE.mkdir(exist_ok=True)
    cache_file = CACHE / (slug(url)[:120] + ".html")
    if cache_file.exists():
        return cache_file.read_text(encoding="utf-8", errors="ignore")
    resp = session.get(url, timeout=30)
    if resp.status_code == 403:
        sys.exit(
            "✗ 403 de la SMV: el portal bloquea tráfico automatizado.\n"
            "  Corre este script desde una conexión doméstica en el Perú\n"
            "  (no VPN/datacenter) o descarga el HTML a mano en etl/cache/."
        )
    resp.raise_for_status()
    cache_file.write_text(resp.text, encoding="utf-8")
    time.sleep(RATE_SECONDS)
    return resp.text


def clasificar_rol(cargo: str) -> str:
    for rx, rol in ROL_MAP:
        if rx.search(cargo):
            return rol
    return "director"


def parse_directorio(html: str, empresa_id: str) -> dict:
    """Extrae tablas nombre/cargo de la sección Directorio y Gerencia.

    Los selectores asumen tablas con dos columnas (nombre, cargo); ajustar
    aquí si la SMV cambia el markup.
    """
    soup = BeautifulSoup(html, "lxml")
    personas, directorios = {}, []
    for tabla in soup.select("table"):
        encabezado = tabla.get_text(" ", strip=True).lower()
        if "director" not in encabezado and "gerente" not in encabezado:
            continue
        for fila in tabla.select("tr"):
            celdas = [c.get_text(" ", strip=True) for c in fila.select("td")]
            if len(celdas) < 2 or not celdas[0] or "nombre" in celdas[0].lower():
                continue
            nombre, cargo = celdas[0], celdas[1]
            pid = "p-" + slug(nombre)
            personas[pid] = {"id": pid, "nombre": nombre.title(), "nota": None}
            directorios.append({
                "persona": pid, "empresa": empresa_id,
                "rol": clasificar_rol(cargo),
                "fuente": "SMV — Directorio y Gerencia (scraping)",
            })
    return {"personas": list(personas.values()), "directorios": directorios}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--listar", action="store_true", help="listar emisores detectados")
    ap.add_argument("--emisor", help="scrapear un emisor (id/url SMV)")
    ap.add_argument("--todo", action="store_true", help="scrapear todos los emisores")
    args = ap.parse_args()

    session = requests.Session()
    session.headers.update({"User-Agent": UA, "Accept-Language": "es-PE,es;q=0.9"})

    html = fetch(SMV_EMISORES, session)
    soup = BeautifulSoup(html, "lxml")
    emisores = [
        {"nombre": a.get_text(strip=True), "url": SMV_BASE + str(a.get("href"))}
        for a in soup.select("a[href*='Frm_']") if a.get_text(strip=True)
    ]
    print(f"· {len(emisores)} emisores detectados en SMV")

    if args.listar:
        for e in emisores[:80]:
            print(f"  - {e['nombre']}")
        return

    objetivo = emisores
    if args.emisor:
        objetivo = [e for e in emisores if args.emisor.lower() in e["nombre"].lower()]
    elif not args.todo:
        ap.print_help()
        return

    resultado = {"personas": [], "directorios": []}
    for e in objetivo:
        print(f"  → {e['nombre']}")
        detalle = fetch(e["url"], session)
        parsed = parse_directorio(detalle, slug(e["nombre"]))
        resultado["personas"].extend(parsed["personas"])
        resultado["directorios"].extend(parsed["directorios"])

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT} — revisar a mano y mergear al seed")


if __name__ == "__main__":
    main()
