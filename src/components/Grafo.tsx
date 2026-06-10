import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import type { ElementDefinition, StylesheetStyle } from 'cytoscape'

interface Props {
  elements: ElementDefinition[]
  stylesheet: StylesheetStyle[]
  onSelect?: (id: string | null) => void
  className?: string
  layoutName?: string
}

/** Contenedor Cytoscape reutilizable: re-monta el grafo cuando cambian los elementos. */
export default function Grafo({ elements, stylesheet, onSelect, className, layoutName = 'cose' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const cy = cytoscape({
      container: ref.current,
      elements,
      style: stylesheet,
      layout: {
        name: layoutName,
        animate: false,
        nodeOverlap: 14,
        idealEdgeLength: 90,
        padding: 30,
      } as cytoscape.LayoutOptions,
      wheelSensitivity: 0.2,
      minZoom: 0.25,
      maxZoom: 3,
    })
    cy.on('tap', 'node', (ev) => onSelect?.(ev.target.id()))
    cy.on('tap', (ev) => {
      if (ev.target === cy) onSelect?.(null)
    })
    cyRef.current = cy
    return () => {
      cy.destroy()
      cyRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements])

  return (
    <div className={`cy-box ${className ?? ''}`}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <span className="cy-hint">arrastra · rueda = zoom · clic en nodo = ficha</span>
    </div>
  )
}
