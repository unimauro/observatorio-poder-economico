#!/usr/bin/env python3
"""
Observatorio de Poder Económico del Perú — generador del grafo.

Lee etl/seed/seed_data.json, construye la red (grupos, empresas, personas),
calcula métricas de análisis de redes con NetworkX y exporta un único JSON
estático que consume el frontend (GitHub Pages no necesita backend).

Métricas calculadas offline:
  - Degree / Betweenness / Eigenvector centrality
  - PageRank sobre el grafo de control invertido (el poder fluye hacia arriba)
  - Comunidades (Louvain)
  - Pares de empresas con directores compartidos + Network Affinity Score
  - Economic Power Index (EPI) por grupo económico
  - Concentración por sector (HHI dentro de la muestra)

Uso:  python3 build_graph.py
"""
import json
import math
from collections import defaultdict
from itertools import combinations
from pathlib import Path

import networkx as nx

ROOT = Path(__file__).resolve().parent
SEED = ROOT / "seed" / "seed_data.json"
OUT = ROOT.parent / "public" / "data" / "observatorio.json"

# Pesos del Network Affinity Score (0-100)
W_DIRECTOR = 30   # por director compartido (acumulable hasta 2)
W_OWNER = 25      # accionista/controlador común
W_GROUP = 25      # mismo grupo económico
W_SECTOR = 10     # mismo sector
W_PORTFOLIO = 10  # inversionista institucional común

# Pesos del Economic Power Index (suman 100) — ahora con profundidad financiera
EPI_W = {
    "ingresos": 22,
    "utilidad": 12,
    "activos": 11,
    "ebitda": 8,
    "empleados": 10,
    "empresas": 8,
    "sectores": 7,
    "pagerank": 12,
    "betweenness": 5,
    "grado": 5,
}

# Variables del EPI que se agregan sumando las cifras financieras del grupo
EPI_FIN = ("ingresos", "utilidad", "activos", "ebitda", "empleados")


def minmax(values: dict, log: bool = False) -> dict:
    """Normaliza un dict {clave: valor} a [0, 1]; log opcional para magnitudes monetarias."""
    clean = {k: (math.log1p(v) if log else v) for k, v in values.items() if v is not None}
    if not clean:
        return {k: 0.0 for k in values}
    lo, hi = min(clean.values()), max(clean.values())
    span = (hi - lo) or 1.0
    return {k: (clean.get(k, lo) - lo) / span for k in values}


def ratios(ingresos, ebitda, utilidad, activos, patrimonio) -> dict:
    """Ratios financieros estándar; None cuando falta el insumo o el denominador es cero."""
    def div(a, b):
        return round(100 * a / b, 1) if a is not None and b else None
    return {
        "margen_ebitda": div(ebitda, ingresos),
        "margen_neto": div(utilidad, ingresos),
        "roe": div(utilidad, patrimonio),
        "roa": div(utilidad, activos),
        "apalancamiento": round(activos / patrimonio, 2) if activos and patrimonio else None,
    }


def main() -> None:
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    grupos = {g["id"]: g for g in seed["grupos"]}
    empresas = {e["id"]: e for e in seed["empresas"]}
    personas = {p["id"]: p for p in seed["personas"]}
    fin = {k: v for k, v in seed.get("finanzas", {}).items() if not k.startswith("_")}

    # Fusiona finanzas declaradas en el bloque `finanzas` dentro de cada empresa
    for eid, e in empresas.items():
        f = fin.get(eid, {})
        e["ebitda"] = f.get("ebitda")
        e["utilidad"] = f.get("utilidad")
        e["activos"] = f.get("activos")
        e["patrimonio"] = f.get("patrimonio")
        e["market_cap"] = f.get("market_cap")
        e["ratios"] = ratios(e.get("ingresos_aprox"), e["ebitda"], e["utilidad"],
                             e["activos"], e["patrimonio"])

    # ── Grafo dirigido: propiedad (de → a) y cargos (persona → empresa) ────────
    G = nx.DiGraph()
    for gid, g in grupos.items():
        G.add_node(gid, **{**g, "tipo": "grupo"})
    for eid, e in empresas.items():
        G.add_node(eid, **{**e, "tipo": e.get("tipo", "empresa")})
    for pid, p in personas.items():
        G.add_node(pid, **{**p, "tipo": "persona"})

    edges = []
    for o in seed["propiedad"]:
        G.add_edge(o["de"], o["a"], tipo=o["tipo"], pct=o.get("pct"))
        edges.append({"source": o["de"], "target": o["a"], "tipo": o["tipo"],
                      "pct": o.get("pct"), "fuente": o.get("fuente")})
    for b in seed["directorios"]:
        G.add_edge(b["persona"], b["empresa"], tipo=b["rol"], pct=None)
        edges.append({"source": b["persona"], "target": b["empresa"], "tipo": b["rol"],
                      "pct": None, "fuente": b.get("fuente")})

    # ── Métricas de red ────────────────────────────────────────────────────────
    U = G.to_undirected()
    degree = dict(U.degree())
    betweenness = nx.betweenness_centrality(U, normalized=True)
    try:
        eigen = nx.eigenvector_centrality(U, max_iter=2000)
    except nx.PowerIterationFailedConvergence:
        eigen = nx.degree_centrality(U)
    # PageRank sobre el grafo invertido: la influencia se acumula en quien controla.
    pagerank = nx.pagerank(G.reverse(copy=True), alpha=0.85)
    communities = nx.community.louvain_communities(U, seed=42)
    community_of = {n: i for i, comm in enumerate(communities) for n in comm}

    # ── Directores compartidos y conexiones entre empresas ───────────────────
    seats = defaultdict(list)   # empresa -> [(persona, rol)]
    seats_of = defaultdict(list)  # persona -> [(empresa, rol)]
    for b in seed["directorios"]:
        seats[b["empresa"]].append((b["persona"], b["rol"]))
        seats_of[b["persona"]].append((b["empresa"], b["rol"]))

    owners = defaultdict(set)      # empresa -> controladores/accionistas (control/participación)
    portfolio = defaultdict(set)   # empresa -> inversionistas institucionales
    for o in seed["propiedad"]:
        if o["tipo"] in ("control", "participacion", "matriz"):
            owners[o["a"]].add(o["de"])
        elif o["tipo"] == "portafolio":
            portfolio[o["a"]].add(o["de"])

    pares = []
    for a, b in combinations(sorted(empresas), 2):
        shared_dir = {p for p, _ in seats[a]} & {p for p, _ in seats[b]}
        shared_own = owners[a] & owners[b]
        shared_pf = portfolio[a] & portfolio[b]
        same_group = empresas[a].get("grupo") and empresas[a]["grupo"] == empresas[b].get("grupo")
        same_sector = empresas[a]["sector"] == empresas[b]["sector"]
        if not (shared_dir or shared_own or shared_pf):
            continue
        score = min(100, W_DIRECTOR * min(len(shared_dir), 2)
                    + (W_OWNER if shared_own else 0)
                    + (W_GROUP if same_group else 0)
                    + (W_SECTOR if same_sector else 0)
                    + (W_PORTFOLIO if shared_pf else 0))
        pares.append({
            "a": a, "b": b, "score": score,
            "directores": sorted(personas[p]["nombre"] for p in shared_dir),
            "accionistas": sorted((grupos.get(x) or empresas.get(x, {})).get("nombre", x) for x in shared_own),
            "institucionales": sorted(empresas[x]["nombre"] for x in shared_pf),
            "mismo_grupo": bool(same_group), "mismo_sector": bool(same_sector),
        })
    pares.sort(key=lambda x: -x["score"])

    personas_out = []
    for pid, cargos in seats_of.items():
        personas_out.append({
            "id": pid, "nombre": personas[pid]["nombre"], "nota": personas[pid].get("nota"),
            "cargos": [{"empresa": e, "empresa_nombre": empresas[e]["nombre"], "rol": r} for e, r in cargos],
            "n_empresas": len({e for e, _ in cargos}),
            "betweenness": round(betweenness.get(pid, 0), 4),
            "pagerank": round(pagerank.get(pid, 0), 5),
        })
    personas_out.sort(key=lambda x: -x["n_empresas"])

    # ── Economic Power Index por grupo ────────────────────────────────────────
    members = defaultdict(list)
    for eid, e in empresas.items():
        if e.get("grupo"):
            members[e["grupo"]].append(eid)

    def suma(mids, campo):
        return sum(empresas[m].get(campo) or 0 for m in mids)

    raw = {}
    for gid, mids in members.items():
        sectores = {empresas[m]["sector"] for m in mids}
        nodes_g = [gid] + mids
        raw[gid] = {
            "ingresos": suma(mids, "ingresos_aprox"),
            "empleados": suma(mids, "empleados_aprox"),
            "utilidad": suma(mids, "utilidad"),
            "ebitda": suma(mids, "ebitda"),
            "activos": suma(mids, "activos"),
            "patrimonio": suma(mids, "patrimonio"),
            "market_cap": suma(mids, "market_cap"),
            "empresas": len(mids), "sectores": len(sectores),
            "pagerank": max(pagerank.get(n, 0) for n in nodes_g),
            "betweenness": max(betweenness.get(n, 0) for n in nodes_g),
            "grado": max(degree.get(n, 0) for n in nodes_g),
            "lista_sectores": sorted(sectores),
        }

    norm = {k: minmax({g: raw[g][k] for g in raw}, log=k in EPI_FIN)
            for k in EPI_W}
    ranking = []
    for gid in raw:
        epi = sum(EPI_W[k] * norm[k][gid] for k in EPI_W)
        ranking.append({
            "id": gid, "nombre": grupos[gid]["nombre"], "pais": grupos[gid]["pais"],
            "control": grupos[gid]["control"], "epi": round(epi, 1),
            "componentes": {k: round(EPI_W[k] * norm[k][gid], 1) for k in EPI_W},
            **{k: raw[gid][k] for k in ("ingresos", "empleados", "utilidad", "ebitda",
                                        "activos", "patrimonio", "market_cap",
                                        "empresas", "sectores")},
            "margen_neto": round(100 * raw[gid]["utilidad"] / raw[gid]["ingresos"], 1) if raw[gid]["ingresos"] else None,
            "lista_sectores": raw[gid]["lista_sectores"],
        })
    ranking.sort(key=lambda x: -x["epi"])

    # ── Concentración por sector (HHI dentro de la muestra) ──────────────────
    sect = defaultdict(list)
    for eid, e in empresas.items():
        if e["ingresos_aprox"]:
            sect[e["sector"]].append((eid, e["ingresos_aprox"]))
    sectores_out = []
    for s, items in sect.items():
        total = sum(v for _, v in items)
        shares = [(eid, v, 100 * v / total) for eid, v in items]
        hhi = round(sum(sh * sh for _, _, sh in shares))
        grupos_s = {empresas[eid].get("grupo") for eid, _, _ in shares if empresas[eid].get("grupo")}
        sectores_out.append({
            "sector": s, "ingresos_total": total, "n_empresas": len(items),
            "n_grupos": len(grupos_s), "hhi_muestra": hhi,
            "empresas": [{"id": eid, "nombre": empresas[eid]["nombre"],
                          "grupo": grupos.get(empresas[eid].get("grupo"), {}).get("nombre"),
                          "ingresos": v, "share": round(sh, 1)}
                         for eid, v, sh in sorted(shares, key=lambda x: -x[1])],
        })
    sectores_out.sort(key=lambda x: -x["ingresos_total"])

    # ── Nodos enriquecidos para el grafo ──────────────────────────────────────
    nodes = []
    for n, d in G.nodes(data=True):
        base = {
            "id": n, "label": d.get("nombre", n), "tipo": d["tipo"],
            "sector": d.get("sector"), "grupo": d.get("grupo"),
            "grupo_nombre": grupos.get(d.get("grupo"), {}).get("nombre"),
            "pais": d.get("pais"), "bvl": d.get("bvl", False),
            "ingresos": d.get("ingresos_aprox"), "empleados": d.get("empleados_aprox"),
            "ebitda": d.get("ebitda"), "utilidad": d.get("utilidad"),
            "activos": d.get("activos"), "patrimonio": d.get("patrimonio"),
            "market_cap": d.get("market_cap"), "ratios": d.get("ratios"),
            "por_confirmar": d.get("por_confirmar", False),
            "nota": d.get("nota"), "fuente": d.get("fuente"),
            "grado": degree.get(n, 0),
            "pagerank": round(pagerank.get(n, 0), 5),
            "betweenness": round(betweenness.get(n, 0), 4),
            "eigenvector": round(eigen.get(n, 0), 4),
            "comunidad": community_of.get(n, 0),
        }
        nodes.append(base)

    puentes = sorted(
        (x for x in nodes if x["tipo"] != "persona"),
        key=lambda x: -x["betweenness"])[:12]

    # ── Análisis de estados financieros (empresa a empresa) ──────────────────
    finanzas_out = []
    for eid, e in empresas.items():
        if e.get("ingresos_aprox") is None and e.get("utilidad") is None:
            continue
        finanzas_out.append({
            "id": eid, "nombre": e["nombre"], "sector": e["sector"],
            "grupo_nombre": grupos.get(e.get("grupo"), {}).get("nombre"),
            "bvl": e.get("bvl", False),
            "ingresos": e.get("ingresos_aprox"), "ebitda": e.get("ebitda"),
            "utilidad": e.get("utilidad"), "activos": e.get("activos"),
            "patrimonio": e.get("patrimonio"), "market_cap": e.get("market_cap"),
            "empleados": e.get("empleados_aprox"),
            "ratios": e.get("ratios"), "fuente": e.get("fuente"),
        })
    finanzas_out.sort(key=lambda x: -(x["ingresos"] or 0))

    # ── Bolsa de Valores de Lima: emisores listados ──────────────────────────
    listadas = [f for f in finanzas_out if f["bvl"]]
    bolsa = {
        "n_listadas": len(listadas),
        "market_cap_total": sum(f["market_cap"] or 0 for f in listadas),
        "por_market_cap": sorted(
            [f for f in listadas if f["market_cap"]],
            key=lambda x: -x["market_cap"]),
        "por_sector": [],
        "emisores": listadas,
    }
    cap_sector = defaultdict(float)
    for f in listadas:
        if f["market_cap"]:
            cap_sector[f["sector"]] += f["market_cap"]
    bolsa["por_sector"] = sorted(
        [{"sector": s, "market_cap": round(v)} for s, v in cap_sector.items()],
        key=lambda x: -x["market_cap"])

    out = {
        "meta": {
            **seed["meta"],
            "n_grupos": len(grupos), "n_empresas": len(empresas),
            "n_personas": len(personas), "n_relaciones": len(edges),
            "n_comunidades": len(communities),
            "epi_pesos": EPI_W,
            "afinidad_pesos": {"director_compartido": W_DIRECTOR, "accionista_comun": W_OWNER,
                               "mismo_grupo": W_GROUP, "mismo_sector": W_SECTOR,
                               "institucional_comun": W_PORTFOLIO},
        },
        "nodes": nodes,
        "edges": edges,
        "ranking": ranking,
        "conexiones": {"pares": pares, "personas": personas_out},
        "sectores": sectores_out,
        "finanzas": finanzas_out,
        "bolsa": bolsa,
        "puentes": [{"id": p["id"], "label": p["label"], "tipo": p["tipo"],
                     "grupo_nombre": p["grupo_nombre"], "betweenness": p["betweenness"],
                     "grado": p["grado"]} for p in puentes],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {OUT.relative_to(ROOT.parent)}  "
          f"({len(nodes)} nodos, {len(edges)} aristas, {len(pares)} pares conexos, "
          f"{len(communities)} comunidades)")
    print(f"  {len(finanzas_out)} empresas con finanzas · {bolsa['n_listadas']} listadas BVL "
          f"· cap. total ~S/ {bolsa['market_cap_total']:,} M")
    print(f"  Top EPI: {', '.join(r['nombre'] for r in ranking[:5])}")


if __name__ == "__main__":
    main()
