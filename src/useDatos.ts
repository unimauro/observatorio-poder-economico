import { useEffect, useState } from 'react'
import type { Datos } from './types'

export function useDatos(): { datos: Datos | null; error: string | null } {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/observatorio.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setDatos)
      .catch((e) => setError(String(e)))
  }, [])

  return { datos, error }
}
