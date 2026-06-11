export interface Ratios {
  margen_ebitda: number | null
  margen_neto: number | null
  roe: number | null
  roa: number | null
  apalancamiento: number | null
}

export interface Nodo {
  id: string
  label: string
  tipo: 'grupo' | 'empresa' | 'holding' | 'persona'
  sector: string | null
  grupo: string | null
  grupo_nombre: string | null
  pais: string | null
  bvl: boolean
  ingresos: number | null
  empleados: number | null
  ebitda: number | null
  utilidad: number | null
  activos: number | null
  patrimonio: number | null
  market_cap: number | null
  ratios: Ratios | null
  por_confirmar: boolean
  nota: string | null
  fuente: string | null
  grado: number
  pagerank: number
  betweenness: number
  eigenvector: number
  comunidad: number
}

export interface Finanza {
  id: string
  nombre: string
  sector: string
  grupo_nombre: string | null
  bvl: boolean
  ingresos: number | null
  ebitda: number | null
  utilidad: number | null
  activos: number | null
  patrimonio: number | null
  market_cap: number | null
  empleados: number | null
  ratios: Ratios | null
  fuente: string | null
}

export interface Bolsa {
  n_listadas: number
  market_cap_total: number
  por_market_cap: Finanza[]
  por_sector: { sector: string; market_cap: number }[]
  emisores: Finanza[]
}

export interface Arista {
  source: string
  target: string
  tipo: string
  pct: number | null
  fuente: string | null
}

export interface RankingItem {
  id: string
  nombre: string
  pais: string
  control: string
  epi: number
  componentes: Record<string, number>
  ingresos: number
  empleados: number
  utilidad: number
  ebitda: number
  activos: number
  patrimonio: number
  market_cap: number
  empresas: number
  sectores: number
  margen_neto: number | null
  lista_sectores: string[]
}

export interface ParConexo {
  a: string
  b: string
  score: number
  directores: string[]
  accionistas: string[]
  institucionales: string[]
  mismo_grupo: boolean
  mismo_sector: boolean
}

export interface PersonaConexa {
  id: string
  nombre: string
  nota: string | null
  cargos: { empresa: string; empresa_nombre: string; rol: string }[]
  n_empresas: number
  betweenness: number
  pagerank: number
}

export interface SectorInfo {
  sector: string
  ingresos_total: number
  n_empresas: number
  n_grupos: number
  hhi_muestra: number
  empresas: { id: string; nombre: string; grupo: string | null; ingresos: number; share: number }[]
}

export interface Conflicto {
  tipo: 'vehiculo_compartido' | 'interlock_cruzado' | 'afp_parte_relacionada' | 'conglomerado_financiero'
  titulo: string
  severidad: 'alta' | 'media' | 'baja'
  score: number
  entidades: string[]
  por_que: string
  evidencia: string[]
}

export interface EventoTemporal {
  anio: number
  tipo: string
  grupo: string | null
  grupo_nombre: string
  titulo: string
  descripcion: string
  fuente: string
}

export interface Temporal {
  nota: string
  eventos: EventoTemporal[]
  anios: number[]
  series_grupo: { id: string; nombre: string; valores: (number | null)[] }[]
}

export interface Accionista {
  nombre: string
  id: string
  pct: number | null
  tipo: 'control' | 'participacion' | 'matriz'
  tipo_label: string
  fuente: string | null
}

export interface Composicion {
  id: string
  nombre: string
  sector: string
  grupo_nombre: string | null
  bvl: boolean
  accionistas: Accionista[]
  institucionales: string[]
  pct_conocido: number | null
  resto: number | null
  tiene_numerico: boolean
  controlador: string | null
}

export interface FinGrupo {
  id: string
  nombre: string
  ingresos: number
  utilidad: number
  ebitda: number
  activos: number
  patrimonio: number
  market_cap: number
  margen_neto: number | null
  roe: number | null
  empresas: { nombre: string; ingresos: number; utilidad: number }[]
}

export interface Puente {
  id: string
  label: string
  tipo: string
  grupo_nombre: string | null
  betweenness: number
  grado: number
}

export interface Datos {
  meta: {
    version: string
    actualizado: string
    disclaimer: string
    fuentes: { nombre: string; url: string }[]
    n_grupos: number
    n_empresas: number
    n_personas: number
    n_relaciones: number
    n_comunidades: number
    epi_pesos: Record<string, number>
    afinidad_pesos: Record<string, number>
  }
  nodes: Nodo[]
  edges: Arista[]
  ranking: RankingItem[]
  conexiones: { pares: ParConexo[]; personas: PersonaConexa[] }
  sectores: SectorInfo[]
  finanzas: Finanza[]
  bolsa: Bolsa
  conflictos: {
    resumen: { total: number; alta: number; media: number; por_tipo: Record<string, number> }
    casos: Conflicto[]
  }
  temporal: Temporal
  composicion: Composicion[]
  fin_por_grupo: FinGrupo[]
  puentes: Puente[]
}

export const COMUNIDAD_COLORES = [
  '#e8442e', '#d9a441', '#7fb069', '#6da3d8', '#c47fd4',
  '#4ecdc4', '#e87ea1', '#a0a48e', '#f2a65a', '#8d99ae', '#b5838d', '#90be6d',
]

export const fmtSoles = (v: number | null | undefined): string =>
  v == null ? '—' : `S/ ${v.toLocaleString('es-PE')} M`

export const fmtNum = (v: number | null | undefined): string =>
  v == null ? '—' : v.toLocaleString('es-PE')

/** S/ 12 450 M → "S/ 12.5 mil M" para ejes/tooltips compactos. */
export const fmtSolesCorto = (v: number | null | undefined): string => {
  if (v == null) return '—'
  if (v >= 1000) return `S/ ${(v / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })} mil M`
  return `S/ ${v.toLocaleString('es-PE')} M`
}

export const fmtPct = (v: number | null | undefined): string =>
  v == null ? '—' : `${v.toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`
