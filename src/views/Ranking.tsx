import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import Chart from '../components/Chart'
import type { Datos } from '../types'
import { fmtNum, fmtSoles } from '../types'

const COMP_LABEL: Record<string, string> = {
  ingresos: 'Ingresos',
  utilidad: 'Utilidad',
  activos: 'Activos',
  ebitda: 'EBITDA',
  empleados: 'Empleo',
  empresas: 'N° empresas',
  sectores: 'Diversificación',
  pagerank: 'PageRank',
  betweenness: 'Betweenness',
  grado: 'Conexiones',
}
const COMP_COLOR: Record<string, string> = {
  ingresos: '#e8442e',
  utilidad: '#b32417',
  activos: '#c47fd4',
  ebitda: '#e87ea1',
  empleados: '#f2a65a',
  empresas: '#d9a441',
  sectores: '#90be6d',
  pagerank: '#6da3d8',
  betweenness: '#4ecdc4',
  grado: '#8d99ae',
}

export default function Ranking({ datos }: { datos: Datos }) {
  const ranking = datos.ranking

  const option = useMemo<EChartsOption>(() => {
    const claves = Object.keys(COMP_LABEL)
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'IBM Plex Mono, monospace' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        data: claves.map((k) => COMP_LABEL[k]),
        textStyle: { color: '#9d9180', fontSize: 10 },
        top: 0,
      },
      grid: { left: 8, right: 30, top: 34, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        max: 100,
        name: 'EPI',
        axisLabel: { color: '#6e6557', fontSize: 10 },
        splitLine: { lineStyle: { color: '#241f18' } },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: ranking.map((r) => r.nombre),
        axisLabel: { color: '#ece4d3', fontSize: 12, fontFamily: 'Fraunces, serif' },
        axisLine: { lineStyle: { color: '#2e2820' } },
      },
      series: claves.map((k) => ({
        name: COMP_LABEL[k],
        type: 'bar' as const,
        stack: 'epi',
        itemStyle: { color: COMP_COLOR[k] },
        barWidth: 16,
        data: ranking.map((r) => r.componentes[k] ?? 0),
      })),
    }
  }, [ranking])

  return (
    <section>
      <div className="section-head">
        <h2>Ranking de poder económico</h2>
        <p>
          <strong>Economic Power Index (EPI, 0–100)</strong>: combina tamaño económico (ingresos,
          empleo), amplitud (número de empresas y sectores) y posición en la red (PageRank,
          betweenness, conexiones). La fórmula y los pesos están documentados en Metodología.
        </p>
      </div>
      <div className="panel">
        <div className="panel-head">EPI desagregado por componente</div>
        <div className="panel-body">
          <Chart option={option} height={Math.max(360, ranking.length * 34 + 60)} />
        </div>
      </div>
      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">detalle por grupo</div>
        <div className="panel-body" style={{ overflowX: 'auto' }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>#</th><th>Grupo</th><th>Control</th>
                <th className="num">EPI</th>
                <th className="num">Ingresos</th>
                <th className="num">Utilidad</th>
                <th className="num">Activos</th>
                <th className="num">Market cap</th>
                <th className="num">Empleados</th>
                <th className="num">Empr.</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.id}>
                  <td className="num">{i + 1}</td>
                  <td><b>{r.nombre}</b>{r.pais !== 'Perú' && <span className="dim"> · {r.pais}</span>}</td>
                  <td className="dim">{r.control}</td>
                  <td className="num"><span className={`score-pill ${r.epi >= 60 ? 'score-hi' : r.epi >= 35 ? 'score-mid' : 'score-lo'}`}>{r.epi}</span></td>
                  <td className="num">{fmtSoles(r.ingresos)}</td>
                  <td className="num">{fmtSoles(r.utilidad)}</td>
                  <td className="num">{fmtSoles(r.activos)}</td>
                  <td className="num">{r.market_cap ? fmtSoles(r.market_cap) : '—'}</td>
                  <td className="num">{fmtNum(r.empleados)}</td>
                  <td className="num">{r.empresas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
