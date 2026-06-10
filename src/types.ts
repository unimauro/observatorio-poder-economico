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
  nota: string | null
  fuente: string | null
  grado: number
  pagerank: number
  betweenness: number
  eigenvector: number
  comunidad: number
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
  empresas: number
  sectores: number
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
