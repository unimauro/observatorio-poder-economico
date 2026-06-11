import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import Chart from '../components/Chart'
import type { Datos } from '../types'
import { fmtPct } from '../types'

const TIPO_COLOR: Record<string, string> = {
  control: '#e8442e', matriz: '#b32417', participacion: '#d9a441',
}
const RESTO_COLOR = '#3d362b'

export default function Composicion({ datos }: { datos: Datos }) {
  const numericas = useMemo(() => datos.composicion.filter((c) => c.tiene_numerico), [datos])
  const cualitativas = useMemo(() => datos.composicion.filter((c) => !c.tiene_numerico), [datos])
  // arranca con una empresa de propiedad repartida (más ilustrativa que un 100%)
  const inicial = useMemo(
    () => numericas.find((c) => c.accionistas.length >= 2 && (c.resto ?? 0) > 1)?.id
      ?? numericas.find((c) => c.accionistas.length >= 2)?.id
      ?? numericas[0]?.id ?? '',
    [numericas],
  )
  const [sel, setSel] = useState<string>(inicial)

  const empresa = datos.composicion.find((c) => c.id === sel) ?? numericas[0]

  // Donut de la empresa seleccionada
  const donut = useMemo<EChartsOption>(() => {
    if (!empresa?.tiene_numerico) return {} as EChartsOption
    const data = empresa.accionistas
      .filter((a) => a.pct != null)
      .map((a) => ({ name: `${a.nombre} (${a.tipo_label})`, value: a.pct,
        itemStyle: { color: TIPO_COLOR[a.tipo] } }))
    if (empresa.resto && empresa.resto > 0.5) {
      data.push({ name: 'Otros / free float / no detallado', value: empresa.resto,
        itemStyle: { color: RESTO_COLOR } })
    }
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'IBM Plex Mono, monospace' },
      tooltip: { formatter: (p: unknown) => {
        const d = p as { name: string; value: number; percent: number }
        return `${d.name}<br/>${fmtPct(d.value)}`
      } },
      legend: { type: 'scroll', orient: 'horizontal', bottom: 0,
        textStyle: { color: '#9d9180', fontSize: 10 } },
      series: [{
        type: 'pie', radius: ['46%', '74%'], center: ['50%', '44%'],
        itemStyle: { borderColor: '#1a1712', borderWidth: 2 },
        label: { color: '#ece4d3', fontSize: 10, formatter: '{d}%' },
        data,
      }],
    } as EChartsOption
  }, [empresa])

  // Barra apilada de free float para las listadas con control numérico
  const floatBar = useMemo<EChartsOption>(() => {
    const listadas = numericas
      .filter((c) => c.bvl && c.resto != null)
      .sort((a, b) => (a.resto ?? 0) - (b.resto ?? 0))
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'IBM Plex Mono, monospace' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Bloque de control', 'Otros / float'], top: 0,
        textStyle: { color: '#9d9180', fontSize: 10 } },
      grid: { left: 8, right: 40, top: 34, bottom: 8, containLabel: true },
      xAxis: { type: 'value', max: 100, axisLabel: { color: '#6e6557', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#241f18' } } },
      yAxis: { type: 'category', data: listadas.map((c) => c.nombre),
        axisLabel: { color: '#ece4d3', fontSize: 11 }, axisLine: { lineStyle: { color: '#2e2820' } } },
      series: [
        { name: 'Bloque de control', type: 'bar', stack: 't', itemStyle: { color: '#e8442e' },
          data: listadas.map((c) => c.pct_conocido) },
        { name: 'Otros / float', type: 'bar', stack: 't', itemStyle: { color: RESTO_COLOR },
          label: { show: true, position: 'right', color: '#9d9180', fontSize: 9,
            formatter: (p: unknown) => fmtPct((p as { value: number }).value) },
          data: listadas.map((c) => c.resto) },
      ],
    }
  }, [numericas])

  return (
    <section>
      <div className="section-head">
        <h2>🥧 Composición accionarial</h2>
        <p>
          Quién es dueño de cada empresa y en qué proporción, según la propiedad declarada. Cuando
          la suma de participaciones conocidas no llega a 100%, el resto se marca como
          <strong> «Otros / free float / no detallado»</strong> — no asumimos a quién pertenece. Los
          porcentajes son aproximados; cada uno lleva su fuente.
        </p>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="panel-head">
            estructura de propiedad
            <select value={sel} onChange={(e) => setSel(e.target.value)}
              style={{ background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--text)',
                fontFamily: 'var(--mono)', fontSize: 12, padding: '5px 8px', maxWidth: 240 }}>
              {numericas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="panel-body"><Chart option={donut} height={420} /></div>
        </div>
        <aside className="panel">
          <div className="panel-head">accionistas · {empresa?.nombre}</div>
          <div className="panel-body">
            {empresa && (
              <>
                {empresa.grupo_nombre && <div className="dim" style={{ marginBottom: 8 }}>Grupo: {empresa.grupo_nombre}{empresa.bvl ? ' · listada en BVL' : ''}</div>}
                <table className="tabla">
                  <tbody>
                    {empresa.accionistas.map((a, i) => (
                      <tr key={i}>
                        <td><b>{a.nombre}</b><br /><span className="dim" style={{ fontSize: 11 }}>{a.tipo_label}</span></td>
                        <td className="num">{a.pct != null ? fmtPct(a.pct) : 'mayoritario'}</td>
                      </tr>
                    ))}
                    {empresa.resto != null && empresa.resto > 0.5 && (
                      <tr>
                        <td className="dim">Otros / free float / no detallado</td>
                        <td className="num dim">{fmtPct(empresa.resto)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {empresa.institucionales.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: 'var(--faint)' }}>inversionistas institucionales (AFP)</span>
                    <div style={{ marginTop: 4 }}>
                      {empresa.institucionales.map((x) => <span className="etiqueta" key={x}>{x}</span>)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">bloque de control vs. free float — emisores BVL con % declarado</div>
        <div className="panel-body"><Chart option={floatBar} height={Math.max(280, numericas.filter((c) => c.bvl && c.resto != null).length * 34 + 60)} /></div>
      </div>

      {cualitativas.length > 0 && (
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="panel-head">control declarado sin porcentaje público ({cualitativas.length})</div>
          <div className="panel-body" style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr><th>Empresa</th><th>Controlador</th><th>Grupo</th><th>Sector</th></tr>
              </thead>
              <tbody>
                {cualitativas.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.nombre}</b></td>
                    <td className="dim">{c.controlador ?? '—'}</td>
                    <td className="dim">{c.grupo_nombre ?? '—'}</td>
                    <td className="dim">{c.sector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
