# 🕸️ Observatorio de Poder Económico del Perú

> **¿Quién controla qué?** Grupos económicos, empresas, accionistas y directorios del Perú,
> reconstruidos como un **grafo** a partir de información pública (SMV · BVL · SBS) — con
> PageRank, comunidades Louvain, nodos puente y un índice de poder económico reproducible.

**🌐 En vivo:** https://unimauro.github.io/observatorio-poder-economico/

![Observatorio de Poder Económico del Perú](public/og.png)

## 🧭 Qué encuentras

| Módulo | Qué muestra |
|---|---|
| 🕸️ **Mapa de la red** | Grafo interactivo (Cytoscape): grupos → empresas → personas, con filtros por sector, carteras AFP y comunidades Louvain |
| 🪑 **Directorios y gerencias** | Grafo bipartito persona ↔ empresa con filtro directores/gerentes + pares de empresas con directores compartidos y su **Network Affinity Score** |
| 🏆 **Ranking EPI** | **Economic Power Index** (0–100) por grupo: tamaño financiero + amplitud + posición en la red, desagregado por componente |
| 💰 **Finanzas** | Análisis de estados financieros: scatter tamaño/rentabilidad, ranking ordenable y ratios (margen neto/EBITDA, ROE, ROA, apalancamiento) |
| 📈 **Bolsa (BVL)** | Emisores listados: capitalización bursátil por emisor y sector + P/U indicativo |
| 🏭 **Sectores** | Treemap de ingresos por sector + concentración (HHI sobre la muestra) |
| 🌉 **Puentes** | Betweenness centrality: holdings bisagra y empresas que conectan mundos |
| 📜 **Metodología** | Fórmulas, pesos, fuentes y límites — todo auditable |

## ⚙️ Arquitectura (Fase 1: 100% estática, costo $0)

```
SMV · BVL · SBS · memorias anuales
        │
        ▼
etl/seed/seed_data.json      ← datos semilla con fuente por relación
        │
        ▼
etl/build_graph.py           ← NetworkX: PageRank, betweenness, Louvain, EPI, afinidad
        │
        ▼
public/data/observatorio.json
        │
        ▼
React + Vite + TS  (Cytoscape.js + ECharts)
        │
        ▼
GitHub Pages 🚀
```

El grafo se calcula **offline**; GitHub Pages solo visualiza. Sin backend, sin base de
datos, sin rastreo.

## 🛠️ Desarrollo

```bash
# frontend
npm install
npm run dev

# ETL (regenerar el grafo tras editar el seed)
cd etl
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python build_graph.py
```

## 🤖 Scraper de directorios (experimental)

`etl/scraper_directorios.py` extrae directores y gerentes de los emisores SMV.
⚠️ La SMV devuelve **403 a tráfico automatizado**: hay que correrlo desde una conexión
doméstica en el Perú. La salida se revisa a mano antes de mergear al seed (control
editorial: nada entra al grafo sin fuente).

## 📐 Métricas

- **EPI** = 22·ingresos + 12·utilidad + 11·activos + 8·ebitda + 10·empleados + 8·n_empresas + 7·n_sectores + 12·pagerank + 5·betweenness + 5·grado (normalización min–max, log para magnitudes monetarias)
- **Ratios** = margen neto (utilidad/ingresos), margen EBITDA, ROE (utilidad/patrimonio), ROA (utilidad/activos), apalancamiento (activos/patrimonio)
- **Affinity Score** = 30·director compartido (×2 máx) + 25·accionista común + 25·mismo grupo + 10·mismo sector + 10·AFP común
- **PageRank** sobre el grafo de control invertido: la influencia se acumula en quien controla
- **Louvain** para comunidades; **betweenness** para nodos puente

## 🗺️ Hoja de ruta

- [x] **Fase 1** — sitio estático, grafo pre-calculado, datos semilla con fuentes
- [ ] **Fase 1.5** — scraper SMV/BVL de directorios y gerencias (+ hechos de importancia)
- [ ] **Fase 2** — series temporales (evolución de la red), API FastAPI + Neo4j para rutas indirectas entre grupos (`MATCH p=(g)-[*1..4]-(e) RETURN p`)

## ⚠️ Límites (léelos antes de citar)

Los datos actuales son una **muestra semilla demostrativa** elaborada con información
pública: cifras aproximadas, porcentajes referenciales, cargos sujetos a cambio. Cada
relación lleva su fuente. El HHI se calcula **solo sobre la muestra**, no sobre el mercado
real. Este proyecto muestra **estructuras societarias declaradas ante el regulador**; no
imputa conducta alguna.

## ✍️ Autoría

**Carlos Cárdenas** — [@unimauro](https://github.com/unimauro) · [unimauro.github.io](https://unimauro.github.io)
Proyecto de transparencia económica con datos públicos, hecho en el Perú 🇵🇪.

## 📄 Licencia

MIT — úsalo, fiscalízalo, mejóralo.
