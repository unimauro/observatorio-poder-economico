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

    # ── Detección de superficies de conflicto de interés ─────────────────────
    # NO acusa: marca ESTRUCTURAS societarias declaradas que merecen vigilancia.
    SECTORES_FIN = {"Finanzas y banca", "Seguros", "AFP y fondos"}

    def grupo_de(node, _seen=None):
        """Grupo controlador de un nodo (empresa→su grupo, o resuelto vía dueño)."""
        _seen = _seen or set()
        if node in grupos or node in _seen:
            return node if node in grupos else None
        _seen.add(node)
        if node in empresas:
            g = empresas[node].get("grupo")
            if g:
                return g
            # el control/matriz manda sobre la participación minoritaria
            for tipos in (("control", "matriz"), ("participacion",)):
                for o in seed["propiedad"]:
                    if o["a"] == node and o["tipo"] in tipos:
                        r = grupo_de(o["de"], _seen)
                        if r:
                            return r
        return None

    nombre_de = lambda x: (grupos.get(x) or empresas.get(x) or personas.get(x) or {}).get("nombre", x)
    conflictos = []

    # 1) Vehículos de control compartido: empresa con 2+ grupos en control/participación
    #    (se excluyen las aristas 'matriz': son la estructura normal del holding)
    duenos_reales = defaultdict(set)
    for o in seed["propiedad"]:
        if o["tipo"] in ("control", "participacion"):
            duenos_reales[o["a"]].add(o["de"])
    for eid in empresas:
        gs = {grupo_de(o) for o in duenos_reales[eid]}
        gs.discard(None)
        if len(gs) >= 2:
            conflictos.append({
                "tipo": "vehiculo_compartido",
                "titulo": f"{empresas[eid]['nombre']}: control compartido entre grupos rivales",
                "severidad": "alta", "score": 80 + 5 * len(gs),
                "entidades": [empresas[eid]["nombre"]] + sorted(nombre_de(g) for g in gs),
                "por_que": "Una misma empresa controlada por dos o más grupos económicos crea un "
                           "espacio donde competidores comparten información, directorio y decisiones.",
                "evidencia": sorted({o["fuente"] for o in seed["propiedad"]
                                     if o["a"] == eid and o.get("fuente")}),
            })

    # 2) Directorios entrelazados: persona que se sienta en empresas de 2+ grupos
    for pid, cargos in seats_of.items():
        if personas[pid].get("por_confirmar"):
            continue
        por_grupo = defaultdict(list)
        for e, r in cargos:
            g = grupo_de(e)
            if g:
                por_grupo[g].append(empresas[e]["nombre"])
        if len(por_grupo) >= 2:
            conflictos.append({
                "tipo": "interlock_cruzado",
                "titulo": f"{personas[pid]['nombre']} enlaza {len(por_grupo)} grupos económicos",
                "severidad": "alta" if len(por_grupo) >= 2 and len(cargos) >= 3 else "media",
                "score": 60 + 8 * len(por_grupo) + 3 * len(cargos),
                "entidades": [personas[pid]["nombre"]] + sorted(nombre_de(g) for g in por_grupo),
                "por_que": "Un mismo director sentado en empresas de grupos distintos es un canal "
                           "directo de coordinación e información entre ellos (interlocking directorate).",
                "evidencia": [f"{nombre_de(g)}: {', '.join(es)}" for g, es in por_grupo.items()],
            })

    # 3) AFP con inversión en parte relacionada (mismo grupo económico)
    for eid in empresas:
        for inv in portfolio[eid]:
            if empresas.get(inv, {}).get("grupo") and empresas[inv]["grupo"] == grupo_de(eid):
                conflictos.append({
                    "tipo": "afp_parte_relacionada",
                    "titulo": f"{empresas[inv]['nombre']} invierte en {empresas[eid]['nombre']} (mismo grupo)",
                    "severidad": "alta", "score": 75,
                    "entidades": [empresas[inv]["nombre"], empresas[eid]["nombre"],
                                  nombre_de(grupo_de(eid))],
                    "por_que": "Una AFP que coloca el ahorro previsional en empresas de su propio "
                               "grupo económico enfrenta un conflicto fiduciario: gestiona dinero "
                               "ajeno con incentivo a favorecer a la casa matriz.",
                    "evidencia": sorted({o["fuente"] for o in seed["propiedad"]
                                         if o["a"] == eid and o["de"] == inv and o.get("fuente")}),
                })

    # 4) Conglomerado financiero integrado: grupo presente en 2+ de banca/seguros/AFP
    miembros_grupo = defaultdict(list)
    for eid, e in empresas.items():
        if e.get("grupo"):
            miembros_grupo[e["grupo"]].append(eid)
    for gid, mids in miembros_grupo.items():
        fin_sectores = {empresas[m]["sector"] for m in mids} & SECTORES_FIN
        if len(fin_sectores) >= 2:
            empresas_fin = [empresas[m]["nombre"] for m in mids
                            if empresas[m]["sector"] in SECTORES_FIN]
            conflictos.append({
                "tipo": "conglomerado_financiero",
                "titulo": f"{grupos[gid]['nombre']}: conglomerado en {len(fin_sectores)} verticales financieras",
                "severidad": "alta" if len(fin_sectores) >= 3 else "media",
                "score": 55 + 12 * len(fin_sectores),
                "entidades": [grupos[gid]["nombre"]] + sorted(fin_sectores),
                "por_que": "Un mismo grupo que controla banca, seguros y/o AFP concentra el sistema "
                           "financiero: el ahorro, el crédito y la previsión pasan por la misma caja.",
                "evidencia": empresas_fin,
            })

    # ── Línea de tiempo: hitos corporativos + trayectoria de ingresos ────────
    temporal_seed = seed.get("temporal", {})
    eventos = sorted(temporal_seed.get("eventos", []), key=lambda e: e["anio"])
    for ev in eventos:
        ev["grupo_nombre"] = grupos.get(ev.get("grupo"), {}).get("nombre", ev.get("grupo"))
    anios = sorted({a for serie in temporal_seed.get("ingresos_grupo", {}).values() for a in serie})
    series_grupo = [
        {"id": gid, "nombre": grupos.get(gid, {}).get("nombre", gid),
         "valores": [serie.get(a) for a in anios]}
        for gid, serie in temporal_seed.get("ingresos_grupo", {}).items()
    ]
    temporal_out = {
        "nota": temporal_seed.get("_nota", ""),
        "eventos": eventos, "anios": anios, "series_grupo": series_grupo,
    }

    conflictos.sort(key=lambda x: -x["score"])
    conflictos_resumen = {
        "total": len(conflictos),
        "alta": sum(1 for c in conflictos if c["severidad"] == "alta"),
        "media": sum(1 for c in conflictos if c["severidad"] == "media"),
        "por_tipo": {t: sum(1 for c in conflictos if c["tipo"] == t)
                     for t in {c["tipo"] for c in conflictos}},
    }

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
        # no metemos al grafo empresas aisladas (sin vínculos): ensucian el layout;
        # siguen visibles en Bolsa/Finanzas/Sectores/Composición.
        if d["tipo"] in ("empresa", "holding") and degree.get(n, 0) == 0:
            continue
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
        # incluye toda listada BVL aunque no tenga EEFF, para que aparezca en Bolsa
        if e.get("ingresos_aprox") is None and e.get("utilidad") is None and not e.get("bvl"):
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

    # ── Composición accionarial por empresa ──────────────────────────────────
    TIPOS_PROP = ("control", "participacion", "matriz")
    TIPO_LABEL = {"control": "control", "participacion": "participación",
                  "matriz": "matriz (holding)"}
    composicion = []
    for eid, e in empresas.items():
        incoming = [o for o in seed["propiedad"]
                    if o["a"] == eid and o["tipo"] in TIPOS_PROP]
        if not incoming:
            continue
        accionistas = [{
            "nombre": nombre_de(o["de"]), "id": o["de"], "pct": o.get("pct"),
            "tipo": o["tipo"], "tipo_label": TIPO_LABEL[o["tipo"]], "fuente": o.get("fuente"),
        } for o in incoming]
        institucionales = sorted({nombre_de(o["de"]) for o in seed["propiedad"]
                                  if o["a"] == eid and o["tipo"] == "portafolio"})
        con_pct = [a for a in accionistas if a["pct"] is not None]
        sum_pct = round(sum(a["pct"] for a in con_pct), 2)
        tiene_numerico = bool(con_pct)
        ctrl = next((a for a in accionistas if a["tipo"] in ("control", "matriz")), None)
        composicion.append({
            "id": eid, "nombre": e["nombre"], "sector": e["sector"],
            "grupo_nombre": grupos.get(e.get("grupo"), {}).get("nombre"),
            "bvl": e.get("bvl", False),
            "accionistas": sorted(accionistas, key=lambda a: -(a["pct"] or 0)),
            "institucionales": institucionales,
            "pct_conocido": sum_pct if tiene_numerico else None,
            "resto": round(max(0.0, 100 - sum_pct), 2) if tiene_numerico else None,
            "tiene_numerico": tiene_numerico,
            "controlador": ctrl["nombre"] if ctrl else None,
        })
    composicion.sort(key=lambda c: (not c["tiene_numerico"], -(c["pct_conocido"] or 0), c["nombre"]))

    # ── Dashboard financiero por grupo (ingresos desglosados por empresa) ────
    fin_por_grupo = []
    for r in ranking:
        mids = [f for f in finanzas_out if f["grupo_nombre"] == r["nombre"]]
        fin_por_grupo.append({
            "id": r["id"], "nombre": r["nombre"],
            "ingresos": r["ingresos"], "utilidad": r["utilidad"],
            "ebitda": r["ebitda"], "activos": r["activos"],
            "patrimonio": r["patrimonio"], "market_cap": r["market_cap"],
            "margen_neto": r["margen_neto"],
            "roe": round(100 * r["utilidad"] / r["patrimonio"], 1) if r["patrimonio"] else None,
            "empresas": sorted(
                [{"nombre": m["nombre"], "ingresos": m["ingresos"] or 0,
                  "utilidad": m["utilidad"] or 0} for m in mids],
                key=lambda x: -x["ingresos"]),
        })

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
        "conflictos": {"resumen": conflictos_resumen, "casos": conflictos},
        "temporal": temporal_out,
        "composicion": composicion,
        "fin_por_grupo": fin_por_grupo,
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
    print(f"  {conflictos_resumen['total']} superficies de conflicto "
          f"({conflictos_resumen['alta']} alta · {conflictos_resumen['media']} media): "
          f"{conflictos_resumen['por_tipo']}")
    print(f"  {len(composicion)} empresas con composición accionarial "
          f"({sum(1 for c in composicion if c['tiene_numerico'])} con % numérico)")
    print(f"  Top EPI: {', '.join(r['nombre'] for r in ranking[:5])}")


if __name__ == "__main__":
    main()
