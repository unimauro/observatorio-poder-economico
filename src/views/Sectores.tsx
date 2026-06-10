import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import Chart from '../components/Chart'
import type { Datos } from '../types'
import { fmtSoles } from '../types'

export default function Sectores({ datos }: { datos: Datos }) {
  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'IBM Plex Mono, monospace' },
    tooltip: {
      formatter: (p: unknown) => {
        const q = p as { name: string; value: number }
        return `${q.name}<br/>${fmtSoles(q.value)}`
      },
    },
    series: [{
      type: 'treemap',
      roam: false,
      nodeClick: 'zoomToNode',
      breadcrumb: { show: true, itemStyle: { color: '#1a1712', textStyle: { color: '#9d9180' } } },
      label: { show: true, fontSize: 11, color: '#0f0d0a', fontWeight: 'bold' },
      upperLabel: { show: true, height: 22, color: '#ece4d3', fontSize: 11 },
      itemStyle: { borderColor: '#0f0d0a', borderWidth: 2, gapWidth: 2 },
      levels: [
        { itemStyle: { borderWidth: 0, gapWidth: 3 } },
        { itemStyle: { gapWidth: 1 } },
      ],
      color: ['#e8442e', '#d9a441', '#7fb069', '#6da3d8', '#c47fd4', '#4ecdc4', '#e87ea1', '#f2a65a', '#a0a48e', '#b5838d', '#8d99ae', '#90be6d'],
      data: datos.sectores.map((s) => ({
        name: s.sector,
        value: s.ingresos_total,
        children: s.empresas.map((e) => ({
          name: e.grupo ? `${e.nombre} (${e.grupo})` : e.nombre,
          value: e.ingresos,
        })),
      })),
    }],
  }), [datos])

  return (
    <section>
      <div className="section-head">
        <h2>Concentración sectorial</h2>
        <p>
          Cuánto pesa cada grupo dentro de cada sector <strong>en la muestra</strong>. El HHI
          (Herfindahl–Hirschman) se calcula solo sobre las empresas registradas aquí: indica
          concentración relativa de la muestra, <strong>no</strong> la concentración real de cada
          mercado.
        </p>
      </div>
      <div className="panel">
        <div className="panel-head">mapa de sectores por ingresos aprox. (clic para entrar)</div>
        <div className="panel-body">
          <Chart option={option} height={520} />
        </div>
      </div>
      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">concentración por sector (sobre la muestra)</div>
        <div className="panel-body" style={{ overflowX: 'auto' }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Sector</th>
                <th className="num">Ingresos muestra</th>
                <th className="num">Empresas</th>
                <th className="num">Grupos</th>
                <th className="num">HHI muestra</th>
                <th>Líder en la muestra</th>
              </tr>
            </thead>
            <tbody>
              {datos.sectores.map((s) => {
                const lider = s.empresas[0]
                return (
                  <tr key={s.sector}>
                    <td><b>{s.sector}</b></td>
                    <td className="num">{fmtSoles(s.ingresos_total)}</td>
                    <td className="num">{s.n_empresas}</td>
                    <td className="num">{s.n_grupos}</td>
                    <td className="num">
                      <span className={`score-pill ${s.hhi_muestra >= 5000 ? 'score-hi' : s.hhi_muestra >= 2500 ? 'score-mid' : 'score-lo'}`}>
                        {s.hhi_muestra.toLocaleString('es-PE')}
                      </span>
                    </td>
                    <td className="dim">{lider?.nombre} · {lider?.share}%{lider?.grupo ? ` (${lider.grupo})` : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
