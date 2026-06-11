import { useState } from 'react'
import { useDatos } from './useDatos'
import Red from './views/Red'
import Directorios from './views/Directorios'
import Ranking from './views/Ranking'
import Sectores from './views/Sectores'
import Finanzas from './views/Finanzas'
import Bolsa from './views/Bolsa'
import Composicion from './views/Composicion'
import Conflictos from './views/Conflictos'
import Temporal from './views/Temporal'
import Puentes from './views/Puentes'
import Metodologia from './views/Metodologia'
import { fmtNum } from './types'

const TABS = [
  { id: 'red', label: '🕸️ Mapa de la red' },
  { id: 'directorios', label: '🪑 Directorios y gerencias' },
  { id: 'ranking', label: '🏆 Ranking EPI' },
  { id: 'finanzas', label: '💰 Finanzas' },
  { id: 'composicion', label: '🥧 Composición accionarial' },
  { id: 'bolsa', label: '📈 Bolsa (BVL)' },
  { id: 'sectores', label: '🏭 Sectores' },
  { id: 'conflictos', label: '🔍 Conflictos' },
  { id: 'temporal', label: '🕰️ Mapa temporal' },
  { id: 'puentes', label: '🌉 Puentes' },
  { id: 'metodologia', label: '📜 Metodología' },
] as const

type TabId = (typeof TABS)[number]['id']

const TAB_IDS = TABS.map((t) => t.id)
const hashTab = (): TabId => {
  const h = window.location.hash.replace('#', '') as TabId
  return TAB_IDS.includes(h) ? h : 'red'
}

export default function App() {
  const { datos, error } = useDatos()
  const [tab, setTabState] = useState<TabId>(hashTab)
  const setTab = (t: TabId) => {
    setTabState(t)
    window.location.hash = t
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <div className="aviso">
        <div className="wrap">
          <b>DATOS SEMILLA</b>
          <span>
            muestra demostrativa elaborada con fuentes públicas (SMV · BVL · SBS) — cifras
            aproximadas, verificar antes de citar
          </span>
        </div>
      </div>

      <header className="masthead">
        <div className="wrap">
          <div className="kicker">
            inteligencia económica abierta <span className="dot">●</span> análisis de redes{' '}
            <span className="dot">●</span> perú
          </div>
          <h1 className="masthead-title">
            Observatorio de <span className="acento">Poder Económico</span> del Perú
          </h1>
          <p className="masthead-sub">
            <strong>Quién controla qué.</strong> Grupos económicos, empresas, accionistas y
            directorios reconstruidos como un grafo a partir de información pública — con PageRank,
            comunidades Louvain, nodos puente y un índice de poder económico reproducible.
          </p>
          {datos && (
            <div className="kpis">
              <div className="kpi"><b>{datos.meta.n_grupos}</b><span>grupos económicos</span></div>
              <div className="kpi"><b>{datos.meta.n_empresas}</b><span>empresas</span></div>
              <div className="kpi"><b>{datos.meta.n_personas}</b><span>personas</span></div>
              <div className="kpi"><b>{fmtNum(datos.meta.n_relaciones)}</b><span>relaciones</span></div>
              <div className="kpi"><b>{datos.meta.n_comunidades}</b><span>comunidades (louvain)</span></div>
            </div>
          )}
        </div>
      </header>

      <nav className="tabs">
        <div className="wrap">
          {TABS.map((t, i) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main>
        <div className="wrap">
          {error && <div className="cargando">error cargando datos: {error}</div>}
          {!datos && !error && <div className="cargando">construyendo el grafo…</div>}
          {datos && (
            <>
              {tab === 'red' && <Red datos={datos} />}
              {tab === 'directorios' && <Directorios datos={datos} />}
              {tab === 'ranking' && <Ranking datos={datos} />}
              {tab === 'finanzas' && <Finanzas datos={datos} />}
              {tab === 'composicion' && <Composicion datos={datos} />}
              {tab === 'bolsa' && <Bolsa datos={datos} />}
              {tab === 'sectores' && <Sectores datos={datos} />}
              {tab === 'conflictos' && <Conflictos datos={datos} />}
              {tab === 'temporal' && <Temporal datos={datos} />}
              {tab === 'puentes' && <Puentes datos={datos} />}
              {tab === 'metodologia' && <Metodologia datos={datos} />}
            </>
          )}
        </div>
      </main>

      <footer>
        <div className="wrap">
          <span>
            Proyecto de transparencia económica con datos públicos. No constituye asesoría
            financiera ni imputación de conducta alguna: muestra estructuras societarias declaradas
            ante el regulador, con su fuente.
          </span>
          <span>
            Código y datos:{' '}
            <a href="https://github.com/unimauro/observatorio-poder-economico" target="_blank" rel="noopener noreferrer">
              github.com/unimauro/observatorio-poder-economico
            </a>
          </span>
          <span className="firma">
            Un proyecto de{' '}
            <a href="https://unimauro.github.io" target="_blank" rel="noopener noreferrer">
              Carlos Cárdenas
            </a>{' '}
            (<a href="https://github.com/unimauro" target="_blank" rel="noopener noreferrer">@unimauro</a>)
            {datos ? ` · v${datos.meta.version} · actualizado ${datos.meta.actualizado}` : ''} ·
            hecho en el Perú 🇵🇪
          </span>
        </div>
      </footer>
    </>
  )
}
