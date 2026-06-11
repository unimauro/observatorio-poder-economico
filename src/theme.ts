import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

const KEY = 'ope-theme'
const subs = new Set<() => void>()

function read(): Theme {
  try {
    const url = new URLSearchParams(window.location.search).get('theme')
    if (url === 'light' || url === 'dark') return url
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* ignore */ }
  return 'dark'
}

let current: Theme = read()

// aplica el tema al <html> al cargar el módulo (evita parpadeo)
if (typeof document !== 'undefined') document.documentElement.dataset.theme = current

export function getTheme(): Theme {
  return current
}

export function setTheme(t: Theme): void {
  current = t
  try { localStorage.setItem(KEY, t) } catch { /* ignore */ }
  document.documentElement.dataset.theme = t
  subs.forEach((f) => f())
}

export function toggleTheme(): void {
  setTheme(current === 'dark' ? 'light' : 'dark')
}

function subscribe(f: () => void): () => void {
  subs.add(f)
  return () => { subs.delete(f) }
}

/** Suscribe el componente a cambios de tema y devuelve el tema actual. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, getTheme)
}

/** Colores de ejes/texto para ECharts según el tema (las series usan su propia paleta). */
export function tones() {
  const d = current === 'dark'
  return {
    label: d ? '#ece4d3' : '#2a2118',
    dim: d ? '#6e6557' : '#7a6d59',
    split: d ? '#241f18' : '#e4dcc9',
    legend: d ? '#9d9180' : '#6e6151',
    line: d ? '#2e2820' : '#d8cdb6',
    tooltipBg: d ? '#15120e' : '#faf6ec',
  }
}
