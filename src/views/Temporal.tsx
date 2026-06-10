import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import Chart from '../components/Chart'
import type { Datos, EventoTemporal } from '../types'

const TIPO_EMOJI: Record<string, string> = {
  fundacion: '🌱', consolidacion: '🧩', fusion: '➕', salida_bolsa: '📈',
  crisis: '⚠️', cambio_control: '🔄', rebranding: '🏷️', inauguracion: '⛏️',
  venta: '💸', relevo: '👤', expansion: '🚀',
}
const SERIE_COLOR = ['#e8442e', '#d9a441', '#6da3d8', '#7fb069', '#c47fd4', '#4ecdc4', '#e87ea1', '#f2a65a']

export default function Temporal({ datos }: { datos: Datos }) {
  const t = datos.temporal
  const [grupo, setGrupo] = useState<string>('')

  const eventos = useMemo<EventoTemporal[]>(
    () => (grupo ? t.eventos.filter((e) => e.grupo === grupo) : t.eventos),
    [t.eventos, grupo],
  )

  const lineas = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'IBM Plex Mono, monospace' },
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', top: 0, textStyle: { color: '#9d9180', fontSize: 10 } },
    grid: { left: 8, right: 24, top: 38, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category', data: t.anios, boundaryGap: false,
      axisLabel: { color: '#9d9180', fontSize: 11 }, axisLine: { lineStyle: { color: '#2e2820' } },
    },
    yAxis: {
      type: 'value', name: 'Ingresos (S/ mil M)',
      nameTextStyle: { color: '#9d9180', fontSize: 10 },
      axisLabel: { color: '#6e6557', fontSize: 10 }, splitLine: { lineStyle: { color: '#241f18' } },
    },
    series: t.series_grupo.map((s, i) => ({
      name: s.nombre, type: 'line' as const, smooth: true, symbol: 'circle', symbolSize: 6,
      emphasis: { focus: 'series' as const },
      lineStyle: { width: grupo && s.id === grupo ? 3.5 : 2 },
      itemStyle: { color: SERIE_COLOR[i % SERIE_COLOR.length] },
      opacity: grupo && s.id !== grupo ? 0.25 : 1,
      data: s.valores,
    })),
  }), [t, grupo])

  return (
    <section>
      <div className="section-head">
        <h2>🕰️ Mapa temporal</h2>
        <p>
          Cómo se movió el poder económico en el tiempo: <strong>hitos corporativos</strong>
          documentados (fusiones, salidas a bolsa, cambios de control) y la <strong>trayectoria de
          ingresos</strong> de los principales grupos. Las curvas son <em>ilustrativas</em> (forma de
          crecimiento, no cifras auditadas año a año); los hitos sí están documentados con fuente.
        </p>
      </div>

      <div className="panel">
        <div className="panel-head">
          trayectoria de ingresos por grupo (S/ mil M, ilustrativa)
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)}
            style={{ background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--text)',
              fontFamily: 'var(--mono)', fontSize: 12, padding: '5px 8px' }}>
            <option value="">resaltar grupo…</option>
            {t.series_grupo.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div className="panel-body"><Chart option={lineas} height={420} /></div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          línea de tiempo de hitos corporativos
          <div className="filtros">
            <button onClick={() => setGrupo('')}
              style={{ background: grupo === '' ? 'var(--carmin-deep)' : 'var(--bg2)',
                color: grupo === '' ? '#fff' : 'var(--muted)', border: '1px solid var(--line)',
                fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>
              todos
            </button>
            {t.series_grupo.map((s) => (
              <button key={s.id} onClick={() => setGrupo(s.id)}
                style={{ background: grupo === s.id ? 'var(--carmin-deep)' : 'var(--bg2)',
                  color: grupo === s.id ? '#fff' : 'var(--muted)', border: '1px solid var(--line)',
                  fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>
                {s.nombre}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body">
          <div className="timeline">
            {eventos.map((e, i) => (
              <div className="hito" key={i}>
                <div className="hito-anio">{e.anio}</div>
                <div className="hito-linea"><span className="hito-punto" /></div>
                <div className="hito-card">
                  <div className="hito-titulo">
                    <span className="hito-emoji">{TIPO_EMOJI[e.tipo] ?? '•'}</span>
                    {e.titulo}
                  </div>
                  <div className="hito-grupo">{e.grupo_nombre} · {e.tipo.replace('_', ' ')}</div>
                  <p className="hito-desc">{e.descripcion}</p>
                  <span className="fuente">Fuente: {e.fuente}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
