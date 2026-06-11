import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import Chart from '../components/Chart'
import type { Datos, Finanza } from '../types'
import { fmtPct, fmtSoles, fmtSolesCorto } from '../types'

const SECTOR_COLOR: Record<string, string> = {
  'Finanzas y banca': '#e8442e',
  'Seguros': '#f2a65a',
  'AFP y fondos': '#e87ea1',
  'Retail': '#d9a441',
  'Consumo masivo': '#90be6d',
  'Minería': '#6da3d8',
  'Energía y combustibles': '#c47fd4',
  'Cemento y construcción': '#a0a48e',
  'Agroindustria': '#7fb069',
  'Salud': '#4ecdc4',
  'Infraestructura': '#8d99ae',
  'Industria y maquinaria': '#b5838d',
}
const colorDe = (s: string) => SECTOR_COLOR[s] ?? '#a0a48e'
const SECTOR_PALETA = ['#e8442e', '#d9a441', '#7fb069', '#6da3d8', '#c47fd4', '#4ecdc4',
  '#e87ea1', '#f2a65a', '#a0a48e', '#b5838d', '#8d99ae', '#90be6d', '#b32417', '#5a8f7b']

type Ordenar = 'ingresos' | 'utilidad' | 'ebitda' | 'activos' | 'market_cap'
const COLS: { k: Ordenar; label: string }[] = [
  { k: 'ingresos', label: 'Ingresos' },
  { k: 'ebitda', label: 'EBITDA' },
  { k: 'utilidad', label: 'Utilidad neta' },
  { k: 'activos', label: 'Activos' },
  { k: 'market_cap', label: 'Market cap' },
]

export default function Finanzas({ datos }: { datos: Datos }) {
  const [orden, setOrden] = useState<Ordenar>('ingresos')
  const fin = datos.finanzas

  // Scatter: ingresos (x) vs utilidad (y), tamaño = activos, color = sector
  const scatter = useMemo<EChartsOption>(() => {
    const conDatos = fin.filter((f) => f.ingresos && f.utilidad != null)
    const maxAct = Math.max(...conDatos.map((f) => f.activos ?? 0), 1)
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'IBM Plex Mono, monospace' },
      tooltip: {
        formatter: (p: unknown) => {
          const d = (p as { data: { f: Finanza } }).data.f
          return `<b>${d.nombre}</b><br/>Ingresos: ${fmtSoles(d.ingresos)}<br/>` +
            `Utilidad: ${fmtSoles(d.utilidad)}<br/>Activos: ${fmtSoles(d.activos)}<br/>` +
            `Margen neto: ${fmtPct(d.ratios?.margen_neto)}`
        },
      },
      grid: { left: 8, right: 24, top: 16, bottom: 48, containLabel: true },
      xAxis: {
        type: 'log', name: 'Ingresos (S/ M, log)', nameLocation: 'middle', nameGap: 32,
        nameTextStyle: { color: '#9d9180', fontSize: 11 },
        axisLabel: { color: '#6e6557', fontSize: 10 }, splitLine: { lineStyle: { color: '#241f18' } },
      },
      yAxis: {
        type: 'log', name: 'Utilidad neta (S/ M, log)',
        nameTextStyle: { color: '#9d9180', fontSize: 11 },
        axisLabel: { color: '#6e6557', fontSize: 10 }, splitLine: { lineStyle: { color: '#241f18' } },
      },
      series: [{
        type: 'scatter',
        // symbolSize recibe el array de valores: [ingresos, utilidad, activos]
        symbolSize: (val: unknown) => {
          const act = (val as number[])[2] ?? 0
          return 8 + 34 * Math.sqrt(act / maxAct)
        },
        itemStyle: {
          color: (p: unknown) => colorDe((p as { data: { f: Finanza } }).data.f.sector),
          opacity: 0.82, borderColor: '#0f0d0a',
        },
        label: {
          show: true, formatter: (p: unknown) => (p as { data: { f: Finanza } }).data.f.nombre.split(' ')[0],
          position: 'top', color: '#9d9180', fontSize: 8,
        },
        data: conDatos.map((f) => ({ value: [f.ingresos, f.utilidad, f.activos ?? 0], f })),
      }],
    }
  }, [fin])

  // Barras ordenables top 18
  const barras = useMemo<EChartsOption>(() => {
    const top = [...fin].filter((f) => f[orden]).sort((a, b) => (b[orden]! - a[orden]!)).slice(0, 18).reverse()
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'IBM Plex Mono, monospace' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (p: unknown) => {
          const a = (p as { name: string; value: number }[])[0]
          return `${a.name}<br/>${fmtSoles(a.value)}`
        } },
      grid: { left: 8, right: 60, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: '#6e6557', fontSize: 10, formatter: (v: number) => fmtSolesCorto(v) }, splitLine: { lineStyle: { color: '#241f18' } } },
      yAxis: { type: 'category', data: top.map((f) => f.nombre),
        axisLabel: { color: '#ece4d3', fontSize: 11 }, axisLine: { lineStyle: { color: '#2e2820' } } },
      series: [{
        type: 'bar', barWidth: 14,
        itemStyle: { color: (p: unknown) => colorDe(top[(p as { dataIndex: number }).dataIndex].sector) },
        label: { show: true, position: 'right', color: '#9d9180', fontSize: 9, formatter: (p: unknown) => fmtSolesCorto((p as { value: number }).value) },
        data: top.map((f) => f[orden]),
      }],
    }
  }, [fin, orden])

  // Dashboard por grupo: ingresos apilados por empresa + margen neto
  const grupos = useMemo<EChartsOption>(() => {
    const g = datos.fin_por_grupo
    const empresasNombre = [...new Set(g.flatMap((x) => x.empresas.map((e) => e.nombre)))]
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'IBM Plex Mono, monospace' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (ps: unknown) => {
          const arr = (ps as { seriesName: string; value: number }[]).filter((p) => p.value)
          return arr.map((p) => `${p.seriesName}: ${fmtSolesCorto(p.value)}`).join('<br/>')
        } },
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: '#6e6557', fontSize: 10, formatter: (v: number) => fmtSolesCorto(v) }, splitLine: { lineStyle: { color: '#241f18' } } },
      yAxis: { type: 'category', data: g.map((x) => x.nombre).reverse(),
        axisLabel: { color: '#ece4d3', fontSize: 11 }, axisLine: { lineStyle: { color: '#2e2820' } } },
      series: empresasNombre.map((nombre, i) => ({
        name: nombre, type: 'bar' as const, stack: 'grp',
        itemStyle: { color: SECTOR_PALETA[i % SECTOR_PALETA.length] },
        emphasis: { focus: 'series' as const },
        data: [...g].reverse().map((x) => x.empresas.find((e) => e.nombre === nombre)?.ingresos ?? 0),
      })),
    }
  }, [datos])

  const tabla = [...fin].sort((a, b) => (b.ingresos ?? 0) - (a.ingresos ?? 0))

  return (
    <section>
      <div className="section-head">
        <h2>Análisis de estados financieros</h2>
        <p>
          Lectura de los <strong>EEFF declarados</strong> (ingresos, EBITDA, utilidad neta, activos,
          patrimonio) y sus <strong>ratios</strong> — margen neto y EBITDA, ROE, ROA y apalancamiento.
          En bancos y aseguradoras el EBITDA no aplica (estructura de balance distinta), por eso su
          margen EBITDA aparece vacío y sus activos dominan el eje (intermediación financiera).
        </p>
      </div>

      <div className="panel">
        <div className="panel-head">tamaño vs. rentabilidad · ingresos × utilidad × activos (burbuja) × sector (color)</div>
        <div className="panel-body"><Chart option={scatter} height={460} /></div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">dashboard por grupo · ingresos agregados desglosados por empresa (S/ M)</div>
        <div className="panel-body"><Chart option={grupos} height={420} /></div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          ranking de empresas
          <div className="filtros">
            {COLS.map((c) => (
              <button key={c.k} className={`chk ${orden === c.k ? '' : ''}`}
                style={{ background: orden === c.k ? 'var(--carmin-deep)' : 'var(--bg2)',
                  color: orden === c.k ? '#fff' : 'var(--muted)', border: '1px solid var(--line)',
                  padding: '4px 10px', cursor: 'pointer' }}
                onClick={() => setOrden(c.k)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body"><Chart option={barras} height={520} /></div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">detalle por empresa · ratios (cifras aprox. en S/ millones)</div>
        <div className="panel-body" style={{ overflowX: 'auto' }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Empresa</th><th>Grupo</th>
                <th className="num">Ingresos</th><th className="num">EBITDA</th>
                <th className="num">Utilidad</th><th className="num">Activos</th>
                <th className="num">Mg. neto</th><th className="num">ROE</th><th className="num">ROA</th>
                <th className="num">Apal.</th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((f) => (
                <tr key={f.id}>
                  <td><b>{f.nombre}</b>{f.bvl && <span className="etiqueta" style={{ color: 'var(--verde)' }}>BVL</span>}</td>
                  <td className="dim">{f.grupo_nombre ?? '—'}</td>
                  <td className="num">{f.ingresos?.toLocaleString('es-PE') ?? '—'}</td>
                  <td className="num">{f.ebitda?.toLocaleString('es-PE') ?? '—'}</td>
                  <td className="num">{f.utilidad?.toLocaleString('es-PE') ?? '—'}</td>
                  <td className="num">{f.activos?.toLocaleString('es-PE') ?? '—'}</td>
                  <td className="num">{fmtPct(f.ratios?.margen_neto)}</td>
                  <td className="num">{fmtPct(f.ratios?.roe)}</td>
                  <td className="num">{fmtPct(f.ratios?.roa)}</td>
                  <td className="num">{f.ratios?.apalancamiento != null ? `${f.ratios.apalancamiento}×` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
