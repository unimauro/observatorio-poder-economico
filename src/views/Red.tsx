import { useMemo, useState } from 'react'
import type { ElementDefinition, StylesheetStyle } from 'cytoscape'
import Grafo from '../components/Grafo'
import FichaNodo from '../components/FichaNodo'
import type { Datos } from '../types'
import { COMUNIDAD_COLORES } from '../types'

const TIPO_COLOR: Record<string, string> = {
  grupo: '#e8442e',
  holding: '#d9a441',
  empresa: '#d8cdb6',
  persona: '#6da3d8',
}

export function estiloBase(colorPorComunidad: boolean): StylesheetStyle[] {
  return [
    {
      selector: 'node',
      style: {
        label: 'data(label)',
        color: '#ece4d3',
        'font-family': 'IBM Plex Mono, monospace',
        'font-size': 8,
        'text-wrap': 'wrap',
        'text-max-width': '90px',
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'background-color': colorPorComunidad ? 'data(colorComunidad)' : 'data(color)',
        width: 'data(size)',
        height: 'data(size)',
        'border-width': 1,
        'border-color': '#0f0d0a',
        'text-outline-color': '#0f0d0a',
        'text-outline-width': 2,
      },
    },
    { selector: 'node[tipo = "grupo"]', style: { shape: 'round-rectangle', 'font-size': 9.5, 'font-weight': 'bold' } },
    { selector: 'node[tipo = "holding"]', style: { shape: 'round-rectangle' } },
    { selector: 'node[tipo = "persona"]', style: { shape: 'diamond' } },
    {
      selector: 'edge',
      style: {
        width: 1.2,
        'line-color': '#3d362b',
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#3d362b',
        'arrow-scale': 0.7,
        opacity: 0.85,
      },
    },
    { selector: 'edge[tipo = "control"]', style: { 'line-color': '#b32417', 'target-arrow-color': '#b32417', width: 1.8 } },
    { selector: 'edge[tipo = "participacion"]', style: { 'line-color': '#d9a441', 'target-arrow-color': '#d9a441' } },
    { selector: 'edge[tipo = "matriz"]', style: { 'line-color': '#8d99ae', 'target-arrow-color': '#8d99ae' } },
    { selector: 'edge[tipo = "portafolio"]', style: { 'line-style': 'dotted', 'line-color': '#6da3d8', 'target-arrow-color': '#6da3d8' } },
    {
      selector: 'edge[tipo = "presidente"], edge[tipo = "director"], edge[tipo = "gerente_general"]',
      style: { 'line-style': 'dashed', 'line-color': '#4ecdc4', 'target-arrow-color': '#4ecdc4', opacity: 0.6 },
    },
    { selector: 'node:selected', style: { 'border-color': '#e8442e', 'border-width': 3 } },
  ]
}

export default function Red({ datos }: { datos: Datos }) {
  const [sector, setSector] = useState('')
  const [conPersonas, setConPersonas] = useState(true)
  const [conPortafolio, setConPortafolio] = useState(true)
  const [porComunidad, setPorComunidad] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [sel, setSel] = useState<string | null>(null)

  const sectores = useMemo(
    () => [...new Set(datos.nodes.map((n) => n.sector).filter(Boolean))].sort() as string[],
    [datos],
  )

  const elements = useMemo<ElementDefinition[]>(() => {
    let nodos = datos.nodes
    if (!conPersonas) nodos = nodos.filter((n) => n.tipo !== 'persona')
    if (sector) {
      const directos = new Set(nodos.filter((n) => n.sector === sector).map((n) => n.id))
      // incluir vecinos a 1 salto para conservar contexto (grupos, dueños, directores)
      const vecinos = new Set<string>()
      for (const e of datos.edges) {
        if (directos.has(e.source)) vecinos.add(e.target)
        if (directos.has(e.target)) vecinos.add(e.source)
      }
      nodos = nodos.filter((n) => directos.has(n.id) || vecinos.has(n.id))
    }
    const ids = new Set(nodos.map((n) => n.id))
    let aristas = datos.edges.filter((e) => ids.has(e.source) && ids.has(e.target))
    if (!conPortafolio) aristas = aristas.filter((e) => e.tipo !== 'portafolio')

    const maxPr = Math.max(...datos.nodes.map((n) => n.pagerank))
    return [
      ...nodos.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          tipo: n.tipo,
          color: TIPO_COLOR[n.tipo] ?? '#d8cdb6',
          colorComunidad: COMUNIDAD_COLORES[n.comunidad % COMUNIDAD_COLORES.length],
          size: 14 + 40 * Math.sqrt(n.pagerank / maxPr),
        },
        selected: n.id === sel,
      })),
      ...aristas.map((e) => ({
        data: { id: `${e.source}->${e.target}-${e.tipo}`, source: e.source, target: e.target, tipo: e.tipo },
      })),
    ]
  }, [datos, sector, conPersonas, conPortafolio, sel])

  const nodoSel = sel ? datos.nodes.find((n) => n.id === sel) : null
  const resultados = busqueda.length > 1
    ? datos.nodes.filter((n) => n.label.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 6)
    : []

  return (
    <section>
      <div className="section-head">
        <h2>Mapa de la red</h2>
        <p>
          Grupos económicos, empresas y personas conectados por control accionario, participaciones,
          carteras institucionales y cargos de dirección. El tamaño del nodo refleja su PageRank
          (influencia acumulada en la cadena de control).
        </p>
      </div>
      <div className="grid2">
        <div className="panel">
          <div className="panel-head">
            <div className="filtros">
              <input
                type="search"
                placeholder="buscar nodo…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <select value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">todos los sectores</option>
                {sectores.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="chk">
                <input type="checkbox" checked={conPersonas} onChange={(e) => setConPersonas(e.target.checked)} />
                personas
              </label>
              <label className="chk">
                <input type="checkbox" checked={conPortafolio} onChange={(e) => setConPortafolio(e.target.checked)} />
                carteras AFP
              </label>
              <label className="chk">
                <input type="checkbox" checked={porComunidad} onChange={(e) => setPorComunidad(e.target.checked)} />
                color por comunidad (Louvain)
              </label>
            </div>
          </div>
          {resultados.length > 0 && (
            <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
              {resultados.map((r) => (
                <button
                  key={r.id}
                  className="etiqueta"
                  style={{ cursor: 'pointer', background: 'none' }}
                  onClick={() => { setSel(r.id); setBusqueda('') }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <Grafo
            elements={elements}
            stylesheet={estiloBase(porComunidad)}
            onSelect={setSel}
          />
          <div className="leyenda">
            <span><i className="sw cuadro" style={{ background: '#e8442e' }} /> grupo</span>
            <span><i className="sw cuadro" style={{ background: '#d9a441' }} /> holding</span>
            <span><i className="sw" style={{ background: '#d8cdb6' }} /> empresa</span>
            <span><i className="sw rombo" style={{ background: '#6da3d8' }} /> persona</span>
            <span style={{ color: '#b32417' }}>━ control</span>
            <span style={{ color: '#d9a441' }}>━ participación</span>
            <span style={{ color: '#6da3d8' }}>┄ portafolio AFP</span>
            <span style={{ color: '#4ecdc4' }}>┅ cargo directivo</span>
          </div>
        </div>
        <aside className="panel">
          <div className="panel-head">ficha</div>
          <div className="panel-body">
            {nodoSel
              ? <FichaNodo nodo={nodoSel} datos={datos} />
              : <p className="dim" style={{ color: 'var(--muted)', fontSize: 13.5 }}>
                  Selecciona un nodo del grafo (o búscalo) para ver su ficha: métricas de red,
                  participaciones, directores y fuentes.
                </p>}
          </div>
        </aside>
      </div>
    </section>
  )
}
