import type { Datos } from '../types'

export default function Puentes({ datos }: { datos: Datos }) {
  const maxB = Math.max(...datos.puentes.map((p) => p.betweenness), 0.0001)
  return (
    <section>
      <div className="section-head">
        <h2>Nodos puente</h2>
        <p>
          <strong>Betweenness centrality</strong>: qué entidades están en el camino más corto entre
          las demás. Un puente alto conecta mundos que de otro modo estarían separados — holdings
          bisagra, empresas con accionariado cruzado, vehículos societarios compartidos. Son los
          puntos por donde pasa la influencia (y donde mirar conflictos de interés).
        </p>
      </div>
      <div className="cards">
        {datos.puentes.map((p, i) => (
          <article className="card-puente" key={p.id}>
            <span className="rank">{String(i + 1).padStart(2, '0')}</span>
            <h4>{p.label}</h4>
            <div className="sub">
              {p.tipo}{p.grupo_nombre ? ` · ${p.grupo_nombre}` : ''} · {p.grado} conexiones
            </div>
            <div className="barra oro">
              <i style={{ width: `${(100 * p.betweenness) / maxB}%` }} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>
              betweenness {p.betweenness.toFixed(3)}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
