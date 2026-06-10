import { useMemo, useState } from 'react'
import type { Conflicto, Datos } from '../types'

const TIPO_META: Record<Conflicto['tipo'], { emoji: string; label: string; desc: string }> = {
  vehiculo_compartido: {
    emoji: '🔗', label: 'Control compartido',
    desc: 'Una empresa controlada por dos o más grupos a la vez: comparten directorio, información y decisiones.',
  },
  interlock_cruzado: {
    emoji: '🪢', label: 'Directorios entrelazados',
    desc: 'Una misma persona sentada en directorios de grupos distintos: canal directo de coordinación.',
  },
  afp_parte_relacionada: {
    emoji: '🏦', label: 'AFP y parte relacionada',
    desc: 'Una AFP que invierte el ahorro previsional en empresas de su propio grupo económico.',
  },
  conglomerado_financiero: {
    emoji: '🏛️', label: 'Conglomerado financiero',
    desc: 'Un grupo presente en banca, seguros y/o AFP: concentra ahorro, crédito y previsión.',
  },
}

const SEV_CLASS: Record<string, string> = { alta: 'score-hi', media: 'score-mid', baja: 'score-lo' }

export default function Conflictos({ datos }: { datos: Datos }) {
  const { resumen, casos } = datos.conflictos
  const [tipo, setTipo] = useState<Conflicto['tipo'] | 'todos'>('todos')

  const visibles = useMemo(
    () => (tipo === 'todos' ? casos : casos.filter((c) => c.tipo === tipo)),
    [casos, tipo],
  )

  return (
    <section>
      <div className="section-head">
        <h2>🔍 Conflictos de interés</h2>
        <p>
          Detección automática de <strong>superficies de conflicto</strong> sobre estructuras
          societarias declaradas: control compartido entre rivales, directores que enlazan grupos,
          AFP invirtiendo en parte relacionada y conglomerados financieros. <strong>No es una
          acusación</strong>: son patrones estructurales que merecen vigilancia, cada uno con su
          evidencia y fuente. La existencia de una estructura no implica conducta indebida.
        </p>
      </div>

      <div className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi"><b>{resumen.total}</b><span>superficies detectadas</span></div>
        <div className="kpi"><b style={{ color: 'var(--carmin)' }}>{resumen.alta}</b><span>severidad alta</span></div>
        <div className="kpi"><b style={{ color: 'var(--ocre)' }}>{resumen.media}</b><span>severidad media</span></div>
        <div className="kpi"><b>{Object.keys(resumen.por_tipo).length}</b><span>patrones distintos</span></div>
      </div>

      <div className="filtros" style={{ marginBottom: 16 }}>
        <button
          onClick={() => setTipo('todos')}
          style={{ background: tipo === 'todos' ? 'var(--carmin-deep)' : 'var(--bg2)',
            color: tipo === 'todos' ? '#fff' : 'var(--muted)', border: '1px solid var(--line)',
            fontFamily: 'var(--mono)', fontSize: 11, padding: '5px 12px', cursor: 'pointer' }}>
          Todos ({resumen.total})
        </button>
        {(Object.keys(TIPO_META) as Conflicto['tipo'][]).map((t) => (
          <button key={t} onClick={() => setTipo(t)}
            style={{ background: tipo === t ? 'var(--carmin-deep)' : 'var(--bg2)',
              color: tipo === t ? '#fff' : 'var(--muted)', border: '1px solid var(--line)',
              fontFamily: 'var(--mono)', fontSize: 11, padding: '5px 12px', cursor: 'pointer' }}>
            {TIPO_META[t].emoji} {TIPO_META[t].label} ({resumen.por_tipo[t] ?? 0})
          </button>
        ))}
      </div>

      <div className="cards">
        {visibles.map((c, i) => {
          const m = TIPO_META[c.tipo]
          return (
            <article className="card-puente" key={i} style={{ borderLeft: `3px solid ${c.severidad === 'alta' ? 'var(--carmin)' : 'var(--ocre)'}` }}>
              <div className="sub" style={{ marginTop: 0, marginBottom: 8 }}>
                {m.emoji} {m.label}
                <span className={`score-pill ${SEV_CLASS[c.severidad]}`} style={{ marginLeft: 8, fontSize: 10 }}>
                  {c.severidad}
                </span>
              </div>
              <h4 style={{ maxWidth: '100%' }}>{c.titulo}</h4>
              <div style={{ margin: '10px 0' }}>
                {c.entidades.map((e) => <span className="etiqueta" key={e}>{e}</span>)}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0' }}>{c.por_que}</p>
              {c.evidencia.length > 0 && (
                <div style={{ borderTop: '1px dashed var(--line-soft)', paddingTop: 8, marginTop: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'var(--faint)' }}>evidencia</span>
                  <ul style={{ marginTop: 4 }}>
                    {c.evidencia.map((ev, j) => (
                      <li key={j} style={{ listStyle: 'none', fontSize: 11.5, color: 'var(--muted)',
                        fontFamily: 'var(--mono)', padding: '2px 0' }}>· {ev}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <p className="dim" style={{ marginTop: 22, fontSize: 12.5, color: 'var(--faint)',
        fontFamily: 'var(--mono)', maxWidth: '76ch' }}>
        Metodología en la pestaña correspondiente. Las superficies se derivan del grafo de propiedad
        y directorios; ampliar la base de datos (proveedores, créditos, contratos con el Estado)
        revelará más cruces. Si detectas un error en una estructura, abre un issue con la fuente.
      </p>
    </section>
  )
}
