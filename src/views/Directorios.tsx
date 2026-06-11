import { useMemo, useState } from 'react'
import type { ElementDefinition } from 'cytoscape'
import Grafo from '../components/Grafo'
import FichaNodo from '../components/FichaNodo'
import { estiloBase } from './Red'
import type { Datos } from '../types'

const ROLES = ['presidente', 'director', 'gerente_general']
const ROL_LABEL: Record<string, string> = {
  presidente: 'preside',
  director: 'dirige',
  gerente_general: 'gerencia',
}

type Filtro = 'todos' | 'directores' | 'gerentes'

/** Mapa de distribución de cargos: grafo bipartito personas ↔ empresas. */
export default function Directorios({ datos }: { datos: Datos }) {
  const [sel, setSel] = useState<string | null>(null)
  const [soloMulti, setSoloMulti] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const elements = useMemo<ElementDefinition[]>(() => {
    const rolesAct = filtro === 'gerentes' ? ['gerente_general']
      : filtro === 'directores' ? ['presidente', 'director']
      : ROLES
    const cargos = datos.edges.filter((e) => rolesAct.includes(e.tipo))
    const personas = new Set(cargos.map((e) => e.source))
    const multi = new Set(
      datos.conexiones.personas.filter((p) => p.n_empresas > 1).map((p) => p.id),
    )
    const personasVisibles = soloMulti ? new Set([...personas].filter((p) => multi.has(p))) : personas
    const aristas = cargos.filter((e) => personasVisibles.has(e.source))
    const empresas = new Set(aristas.map((e) => e.target))

    const nodos = datos.nodes.filter((n) => personasVisibles.has(n.id) || empresas.has(n.id))
    const maxGrado = Math.max(...nodos.map((n) => n.grado), 1)
    return [
      ...nodos.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          tipo: n.tipo,
          color: n.tipo === 'persona' ? '#6da3d8' : '#d8cdb6',
          colorComunidad: n.tipo === 'persona' ? '#6da3d8' : '#d8cdb6',
          size: 16 + 30 * (n.grado / maxGrado),
        },
        selected: n.id === sel,
      })),
      ...aristas.map((e) => ({
        data: { id: `${e.source}->${e.target}-${e.tipo}`, source: e.source, target: e.target, tipo: e.tipo },
      })),
    ]
  }, [datos, soloMulti, sel, filtro])

  const nodoSel = sel ? datos.nodes.find((n) => n.id === sel) : null
  const pares = datos.conexiones.pares.filter((p) => p.directores.length > 0)
  const nombreDe = (id: string) => datos.nodes.find((n) => n.id === id)?.label ?? id

  // Liderazgo ejecutivo: presidente del directorio + gerente general por empresa
  const liderazgo = useMemo(() => {
    const empresasN = datos.nodes.filter((n) => n.tipo === 'empresa' || n.tipo === 'holding')
    return empresasN
      .map((e) => {
        const pres = datos.edges.find((ed) => ed.target === e.id && ed.tipo === 'presidente')
        const ceo = datos.edges.find((ed) => ed.target === e.id && ed.tipo === 'gerente_general')
        return {
          id: e.id, empresa: e.label, grupo: e.grupo_nombre,
          presidente: pres ? nombreDe(pres.source) : null,
          ceo: ceo ? nombreDe(ceo.source) : null,
        }
      })
      .filter((x) => x.presidente || x.ceo)
      .sort((a, b) => Number(!!b.ceo) - Number(!!a.ceo))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos])

  return (
    <section>
      <div className="section-head">
        <h2>Directorios y gerencias</h2>
        <p>
          Quién se sienta en qué mesa: cada rombo es una persona, cada círculo una empresa, y cada
          arista un cargo (presidencia, dirección o gerencia general). Las personas que aparecen en
          varios directorios son los <strong>puentes humanos</strong> entre empresas y grupos. La
          <strong> gerencia general (CEO)</strong> es la línea ejecutiva, distinta de la presidencia
          del directorio.
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">liderazgo ejecutivo · presidencia del directorio y gerencia general (CEO)</div>
        <div className="panel-body" style={{ overflowX: 'auto' }}>
          <table className="tabla">
            <thead>
              <tr><th>Empresa</th><th>Grupo</th><th>Presidente del directorio</th><th>Gerente General / CEO</th></tr>
            </thead>
            <tbody>
              {liderazgo.map((l) => (
                <tr key={l.id}>
                  <td><b>{l.empresa}</b></td>
                  <td className="dim">{l.grupo ?? '—'}</td>
                  <td>{l.presidente ?? <span className="dim">—</span>}</td>
                  <td>{l.ceo
                    ? <b style={{ color: 'var(--ocre)' }}>{l.ceo}</b>
                    : <span className="dim">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid2">
        <div className="panel">
          <div className="panel-head">
            <div className="filtros">
              {(['todos', 'directores', 'gerentes'] as const).map((f) => (
                <button key={f}
                  style={{ background: filtro === f ? 'var(--carmin-deep)' : 'var(--bg2)',
                    color: filtro === f ? '#fff' : 'var(--muted)', border: '1px solid var(--line)',
                    fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 10px', cursor: 'pointer',
                    textTransform: 'capitalize' }}
                  onClick={() => setFiltro(f)}>
                  {f}
                </button>
              ))}
            </div>
            <label className="chk">
              <input type="checkbox" checked={soloMulti} onChange={(e) => setSoloMulti(e.target.checked)} />
              solo personas con 2+ cargos
            </label>
          </div>
          <Grafo elements={elements} stylesheet={estiloBase(false)} onSelect={setSel} className="short" />
          <div className="leyenda">
            <span><i className="sw rombo" style={{ background: '#6da3d8' }} /> persona</span>
            <span><i className="sw" style={{ background: '#d8cdb6' }} /> empresa</span>
            <span style={{ color: '#4ecdc4' }}>┅ cargo (presidente / director / gerente general)</span>
          </div>
        </div>
        <aside className="panel">
          <div className="panel-head">ficha</div>
          <div className="panel-body">
            {nodoSel
              ? <FichaNodo nodo={nodoSel} datos={datos} />
              : (
                <>
                  {datos.conexiones.personas.slice(0, 8).map((p) => (
                    <div className="persona-row" key={p.id}>
                      <span className="n">{p.n_empresas}</span>
                      <b>{p.nombre}</b>
                      <span className="cargos">
                        {p.cargos.map((c) => `${ROL_LABEL[c.rol] ?? c.rol} ${c.empresa_nombre}`).join(' · ')}
                      </span>
                    </div>
                  ))}
                </>
              )}
          </div>
        </aside>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">empresas unidas por directores compartidos · network affinity score</div>
        <div className="panel-body" style={{ overflowX: 'auto' }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Empresa A</th>
                <th>Empresa B</th>
                <th>Directores en común</th>
                <th>Señales</th>
                <th className="num">Afinidad</th>
              </tr>
            </thead>
            <tbody>
              {pares.map((p) => (
                <tr key={`${p.a}-${p.b}`}>
                  <td><b>{nombreDe(p.a)}</b></td>
                  <td><b>{nombreDe(p.b)}</b></td>
                  <td className="dim">{p.directores.join(', ')}</td>
                  <td>
                    {p.mismo_grupo && <span className="etiqueta">mismo grupo</span>}
                    {p.mismo_sector && <span className="etiqueta">mismo sector</span>}
                    {p.accionistas.length > 0 && <span className="etiqueta">accionista común</span>}
                    {p.institucionales.length > 0 && <span className="etiqueta">AFP común</span>}
                  </td>
                  <td className="num">
                    <span className={`score-pill ${p.score >= 70 ? 'score-hi' : p.score >= 40 ? 'score-mid' : 'score-lo'}`}>
                      {p.score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
