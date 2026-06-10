import type { Arista, Datos, Nodo } from '../types'
import { fmtNum, fmtSoles } from '../types'

const REL_LABEL: Record<string, string> = {
  control: 'controla',
  participacion: 'participa en',
  matriz: 'matriz de',
  portafolio: 'invierte (portafolio) en',
  presidente: 'preside',
  director: 'director de',
  gerente_general: 'gerente general de',
}

export default function FichaNodo({ nodo, datos }: { nodo: Nodo; datos: Datos }) {
  const nombreDe = (id: string) => datos.nodes.find((n) => n.id === id)?.label ?? id
  const salientes = datos.edges.filter((e) => e.source === nodo.id)
  const entrantes = datos.edges.filter((e) => e.target === nodo.id)

  const linea = (e: Arista, dir: 'out' | 'in') => {
    const otro = dir === 'out' ? e.target : e.source
    const rel = REL_LABEL[e.tipo] ?? e.tipo
    return (
      <li key={`${dir}-${e.source}-${e.target}-${e.tipo}`}>
        <span className="rel">{dir === 'out' ? rel : `← ${rel}`}</span>{' '}
        <b>{nombreDe(otro)}</b>
        {e.pct != null && <span className="dim"> · {e.pct}%</span>}
      </li>
    )
  }

  return (
    <div className="ficha">
      <span className="tipo-chip">
        {nodo.tipo}
        {nodo.bvl ? ' · BVL' : ''}
        {nodo.pais && nodo.pais !== 'Perú' ? ` · ${nodo.pais}` : ''}
      </span>
      <h3>{nodo.label}</h3>
      {nodo.grupo_nombre && <div className="dim" style={{ marginTop: 4 }}>Grupo: {nodo.grupo_nombre}</div>}
      {nodo.nota && <p className="nota">{nodo.nota}</p>}
      <div className="metricas">
        {nodo.ingresos != null && (
          <div><b>{fmtSoles(nodo.ingresos)}</b><span>ingresos aprox.</span></div>
        )}
        {nodo.empleados != null && (
          <div><b>{fmtNum(nodo.empleados)}</b><span>empleados aprox.</span></div>
        )}
        <div><b>{nodo.grado}</b><span>conexiones</span></div>
        <div><b>{nodo.pagerank.toFixed(4)}</b><span>pagerank</span></div>
        <div><b>{nodo.betweenness.toFixed(3)}</b><span>betweenness</span></div>
        <div><b>#{nodo.comunidad}</b><span>comunidad</span></div>
      </div>
      <ul className="vinculos">
        {salientes.map((e) => linea(e, 'out'))}
        {entrantes.map((e) => linea(e, 'in'))}
      </ul>
      {nodo.fuente && <span className="fuente">Fuente: {nodo.fuente}</span>}
    </div>
  )
}
