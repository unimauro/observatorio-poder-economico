#!/usr/bin/env python3
"""
Carga EEFF APROXIMADOS (S/ millones, FY 2023-2024) a las empresas BVL nuevas,
para que entren al análisis financiero con números. Mismo criterio que el resto
del seed: cifras de muestra marcadas como aprox (banner DATOS SEMILLA), a
reemplazar por EEFF auditados de SMV. Idempotente: solo rellena lo que falta.

Actualiza empresa.ingresos_aprox / empleados_aprox y el bloque finanzas
(ebitda/utilidad/activos/patrimonio), preservando market_cap ya cargado.
"""
import json
from pathlib import Path

SEED = Path(__file__).resolve().parent / "seed" / "seed_data.json"
FUENTE = "Aprox. EEFF 2023–2024 (memorias / SMV) — cifra de muestra, verificar antes de citar"

# id: (ingresos, ebitda, utilidad, activos, patrimonio, empleados)  en S/ M (empleados = número)
# ebitda None en bancos/aseguradoras. Mineras/refinería convertidas de USD (~3.7).
EEFF = {
    # Minería / siderurgia
    "southern-copper": (37000, 20000, 9000, 63000, 33000, 14000),
    "volcan":          (3000,  1100,  150,  9000,  3000,  4500),
    "nexa-peru":       (3700,  950,   200,  6000,  3000,  3500),
    "shougang-hierro": (4000,  1200,  600,  5000,  3500,  4500),
    "poderosa":        (3300,  1000,  500,  2500,  1500,  4000),
    "aceros-arequipa": (6500,  800,   350,  7000,  4000,  4000),
    "siderperu":       (2500,  250,   120,  2500,  1500,  1500),
    # Servicios públicos / energía
    "engie-peru":      (3500,  1400,  600,  9000,  4000,  450),
    "orygen-peru":     (3000,  1200,  500,  8000,  4500,  500),
    "enel-distribucion": (4000, 1100,  500,  7000,  3000,  1300),
    "luz-del-sur":     (4500,  1800,  700,  10000, 4000,  1700),
    "relapasa":        (20000, 500,   200,  7000,  2000,  700),
    "unacem":          (6500,  1600,  600,  14000, 7000,  7000),
    "celepsa":         (400,   250,   120,  1800,  900,   200),
    # Consumo masivo
    "backus":          (7800,  3000,  1700, 6500,  2500,  3500),
    "cerveceria-san-juan": (600, 200,  120,  700,   400,   600),
    "laive":           (1200,  110,   45,   900,   500,   1800),
    "corporacion-lindley": (4500, 700, 250,  5000,  1500,  4000),
    # Finanzas / seguros (ebitda None)
    "banco-pichincha": (1500,  None,  80,   12000, 1200,  2500),
    "la-positiva":     (2500,  None,  150,  5000,  900,   2500),
    "mapfre-peru":     (1200,  None,  60,   2500,  600,   1500),
    # Inmobiliario
    "inv-centenario":  (500,   250,   120,  3000,  1800,  500),
    "los-portales":    (1200,  200,   80,   2500,  700,   1500),
    # Textil
    "creditex":        (300,   30,    10,   400,   250,   1500),
    "michell":         (500,   50,    20,   600,   350,   1200),
    "universal-textil": (250,  20,    8,    350,   200,   800),
    # Medios / diversos
    "el-comercio":     (800,   120,   50,   1200,  600,   3000),
    "hermes":          (500,   90,    35,   700,   300,   3000),
    # Pesca
    "exalmar":         (1500,  250,   80,   2000,  900,   2000),
    "austral-group":   (1800,  300,   100,  2000,  1000,  1500),
    # Agroindustria (azucareras)
    "agro-laredo":     (700,   150,   60,   1500,  900,   2500),
    "agro-pomalca":    (400,   50,    10,   1200,  600,   3000),
    "san-jacinto":     (350,   60,    20,   900,   500,   2000),
}


def main():
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    empresas = {e["id"]: e for e in seed["empresas"]}
    fin = seed.setdefault("finanzas", {})
    n = 0
    for eid, (ing, ebitda, util, act, pat, emp) in EEFF.items():
        e = empresas.get(eid)
        if not e:
            print(f"  ⚠ id no encontrado en seed: {eid}")
            continue
        if e.get("ingresos_aprox") is None:
            e["ingresos_aprox"] = ing
        if e.get("empleados_aprox") is None:
            e["empleados_aprox"] = emp
        e["fuente"] = FUENTE
        prev = fin.get(eid, {})
        fin[eid] = {
            "ebitda": ebitda,
            "utilidad": util,
            "activos": act,
            "patrimonio": pat,
            "market_cap": prev.get("market_cap"),  # preserva market_cap ya cargado
        }
        n += 1

    seed["meta"]["version"] = "0.3.1"
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ EEFF aprox cargados a {n} empresas BVL")


if __name__ == "__main__":
    main()
