import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import Chart from '../components/Chart'
import type { Datos, Finanza } from '../types'
import { fmtPct, fmtSoles, fmtSolesCorto } from '../types'

const PALETA = ['#e8442e', '#d9a441', '#7fb069', '#6da3d8', '#c47fd4', '#4ecdc4',
  '#e87ea1', '#f2a65a', '#a0a48e', '#b5838d', '#8d99ae', '#90be6d']

export default function Bolsa({ datos }: { datos: Datos }) {
  const b = datos.bolsa

  // Market cap por emisor (barras horizontales)
  const capChart = useMemo<EChartsOption>(() => {
    const top = [...b.por_market_cap].slice(0, 18).reverse()
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'IBM Plex Mono, monospace' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (p: unknown) => {
          const a = (p as { name: string; value: number }[])[0]
          return `${a.name}<br/>Capitalización: ${fmtSoles(a.value)}`
        } },
      grid: { left: 8, right: 70, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: '#6e6557', fontSize: 10, formatter: (v: number) => fmtSolesCorto(v) }, splitLine: { lineStyle: { color: '#241f18' } } },
      yAxis: { type: 'category', data: top.map((f) => f.nombre),
        axisLabel: { color: '#ece4d3', fontSize: 11 }, axisLine: { lineStyle: { color: '#2e2820' } } },
      series: [{
        type: 'bar', barWidth: 15, itemStyle: { color: '#d9a441' },
        label: { show: true, position: 'right', color: '#9d9180', fontSize: 9, formatter: (p: unknown) => fmtSolesCorto((p as { value: number }).value) },
        data: top.map((f) => f.market_cap),
      }],
    }
  }, [b])

  // Capitalización por sector (donut)
  const sectorChart = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'IBM Plex Mono, monospace' },
    tooltip: { formatter: (p: unknown) => {
      const d = p as { name: string; value: number; percent: number }
      return `${d.name}<br/>${fmtSoles(d.value)} · ${d.percent}%`
    } },
    legend: { type: 'scroll', orient: 'vertical', right: 0, top: 'center',
      textStyle: { color: '#9d9180', fontSize: 10 } },
    series: [{
      type: 'pie', radius: ['42%', '70%'], center: ['38%', '50%'],
      itemStyle: { borderColor: '#1a1712', borderWidth: 2 },
      label: { color: '#ece4d3', fontSize: 10, formatter: '{b}\n{d}%' },
      color: PALETA,
      data: b.por_sector.map((s) => ({ name: s.sector, value: s.market_cap })),
    }],
  }), [b])

  const valorizadas = [...b.emisores].sort((a, b2) => (b2.market_cap ?? 0) - (a.market_cap ?? 0))

  // Múltiplos simples cuando hay market cap y utilidad: P/U aprox
  const per = (f: Finanza) =>
    f.market_cap && f.utilidad && f.utilidad > 0 ? f.market_cap / f.utilidad : null

  return (
    <section>
      <div className="section-head">
        <h2>📈 Bolsa de Valores de Lima</h2>
        <p>
          Los <strong>{b.n_listadas} emisores</strong> de la muestra que cotizan en la BVL, su
          capitalización bursátil aproximada (~<strong>{fmtSoles(b.market_cap_total)}</strong> en
          conjunto) y un P/U indicativo. La capitalización es referencial: varía a diario y muchos
          emisores peruanos tienen <em>float</em> reducido, así que tómalos como orden de magnitud.
        </p>
      </div>

      <div className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi"><b>{b.n_listadas}</b><span>emisores listados</span></div>
        <div className="kpi"><b>{fmtSolesCorto(b.market_cap_total)}</b><span>capitalización muestra</span></div>
        <div className="kpi"><b>{b.por_sector.length}</b><span>sectores en bolsa</span></div>
        <div className="kpi"><b>{valorizadas[0]?.nombre.split(' ')[0]}</b><span>mayor capitalización</span></div>
      </div>

      <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel">
          <div className="panel-head">capitalización bursátil por emisor (aprox.)</div>
          <div className="panel-body"><Chart option={capChart} height={520} /></div>
        </div>
        <div className="panel">
          <div className="panel-head">peso por sector en la bolsa</div>
          <div className="panel-body"><Chart option={sectorChart} height={520} /></div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">emisores BVL · capitalización, utilidad y P/U indicativo</div>
        <div className="panel-body" style={{ overflowX: 'auto' }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Emisor</th><th>Grupo</th><th>Sector</th>
                <th className="num">Market cap</th><th className="num">Utilidad</th>
                <th className="num">P/U aprox.</th><th className="num">ROE</th>
              </tr>
            </thead>
            <tbody>
              {valorizadas.map((f) => {
                const pu = per(f)
                return (
                  <tr key={f.id}>
                    <td><b>{f.nombre}</b></td>
                    <td className="dim">{f.grupo_nombre ?? '—'}</td>
                    <td className="dim">{f.sector}</td>
                    <td className="num">{f.market_cap ? fmtSoles(f.market_cap) : '—'}</td>
                    <td className="num">{f.utilidad ? fmtSoles(f.utilidad) : '—'}</td>
                    <td className="num">{pu != null ? `${pu.toFixed(1)}×` : '—'}</td>
                    <td className="num">{fmtPct(f.ratios?.roe)}</td>
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
