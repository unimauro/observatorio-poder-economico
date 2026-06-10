import type { Datos } from '../types'

export default function Metodologia({ datos }: { datos: Datos }) {
  const m = datos.meta
  return (
    <section>
      <div className="section-head">
        <h2>Metodología y límites</h2>
      </div>
      <div className="prosa">
        <h3>Qué es esto</h3>
        <p>
          Un mapa de <strong>quién controla qué</strong> en la economía peruana, construido como un
          grafo: grupos económicos, empresas, holdings y personas, unidos por relaciones de control
          accionario, participaciones, carteras institucionales (AFP) y cargos de dirección. Todas
          las métricas se calculan <em>offline</em> con NetworkX y se publican como archivos
          estáticos: no hay servidores, no hay rastreo, el código y los datos son auditables en el
          repositorio.
        </p>

        <h3>Fuentes</h3>
        <ul>
          {m.fuentes.map((f) => (
            <li key={f.url}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.nombre}</a></li>
          ))}
        </ul>

        <h3>Límites (léelos antes de citar)</h3>
        <p>{m.disclaimer}</p>
        <ul>
          <li>Versión <code>{m.version}</code>, actualizada el <code>{m.actualizado}</code>. Es una <strong>muestra semilla</strong>: {m.n_grupos} grupos, {m.n_empresas} empresas, {m.n_personas} personas, {m.n_relaciones} relaciones.</li>
          <li>Los porcentajes accionariales y cifras de ingresos/empleo son <strong>aproximados</strong> y cada relación lleva su fuente.</li>
          <li>El HHI sectorial se calcula <strong>solo sobre la muestra</strong>; no es el HHI del mercado real.</li>
          <li>Los cargos directivos cambian: la fecha de cada memoria anual manda.</li>
        </ul>

        <h3>Economic Power Index (EPI)</h3>
        <p>Índice 0–100 por grupo económico. Cada variable se normaliza min–max (logarítmica para magnitudes monetarias) y se pondera:</p>
        <div className="formula">{`EPI = ${Object.entries(m.epi_pesos).map(([k, v]) => `${v}·${k}`).join(' + ')}

donde ingresos, utilidad, ebitda, activos y empleados se agregan (suma)
sobre las empresas del grupo, y pagerank/betweenness/grado son los
máximos del grupo en la red.`}</div>

        <h3>Análisis de estados financieros</h3>
        <p>
          Cada empresa lleva (cuando la fuente lo permite) ingresos, EBITDA, utilidad neta, activos
          y patrimonio aproximados, en millones de soles. A partir de ahí se calculan los ratios:
        </p>
        <div className="formula">{`margen neto   = utilidad / ingresos
margen EBITDA = ebitda  / ingresos      (no aplica a bancos/aseguradoras)
ROE           = utilidad / patrimonio
ROA           = utilidad / activos
apalancamiento = activos / patrimonio`}</div>
        <p>
          En <strong>bancos y aseguradoras</strong> el EBITDA no es un indicador estándar (su negocio
          es de balance, no operativo-industrial): se deja vacío y sus activos —la cartera y el
          balance— dominan cualquier comparación de tamaño. El P/U de la pestaña Bolsa es
          <code> market cap / utilidad</code>, indicativo.
        </p>

        <h3>Gerencias</h3>
        <p>
          El grafo distingue <strong>directores</strong> (presidencia y directorio) de
          <strong> gerentes generales</strong> (la línea ejecutiva). Como la SMV bloquea el scraping
          automatizado, las gerencias generales aparecen por ahora como <em>slots «por confirmar»</em>:
          el cargo existe y está ubicado en su empresa, pero el nombre del titular se completará
          corriendo <code>etl/scraper_directorios.py</code> desde una conexión en el Perú. No
          inventamos nombres de personas.
        </p>

        <h3>Network Affinity Score</h3>
        <p>Puntaje 0–100 para pares de empresas conectadas por señales societarias:</p>
        <div className="formula">{Object.entries(m.afinidad_pesos).map(([k, v]) => `${String(v).padStart(3)}  ${k.replaceAll('_', ' ')}`).join('\n')}</div>

        <h3>Detección de conflictos de interés</h3>
        <p>
          Sobre el grafo de propiedad y directorios se detectan cuatro <strong>superficies
          estructurales</strong> (no acusaciones): <strong>control compartido</strong> (una empresa
          con dos o más grupos en control/participación, excluyendo la matriz natural del holding),
          <strong> directorios entrelazados</strong> (una persona que se sienta en empresas de grupos
          distintos), <strong>AFP en parte relacionada</strong> (una AFP que invierte en empresas de
          su propio grupo) y <strong>conglomerado financiero</strong> (un grupo presente en dos o más
          de banca/seguros/AFP). Cada caso lleva severidad, el porqué y su evidencia. Una estructura
          declarada no implica conducta indebida: el observatorio la <em>muestra</em> para que se
          fiscalice.
        </p>

        <h3>Mapa temporal</h3>
        <p>
          Combina <strong>hitos corporativos documentados</strong> (fusiones, salidas a bolsa,
          cambios de control, con su fuente) y una <strong>trayectoria de ingresos ilustrativa</strong>
          por grupo. Las curvas muestran la <em>forma</em> del crecimiento, no son cifras auditadas
          año a año — están marcadas como ilustrativas y se reemplazarán por series reales conforme
          se transcriban los EEFF históricos.
        </p>

        <h3>Métricas de red</h3>
        <ul>
          <li><strong>PageRank</strong> sobre el grafo de control invertido: la influencia se acumula en quien controla.</li>
          <li><strong>Betweenness</strong>: nodos puente entre comunidades empresariales.</li>
          <li><strong>Eigenvector</strong>: conexión con nodos a su vez bien conectados.</li>
          <li><strong>Louvain</strong>: detección de comunidades ({m.n_comunidades} detectadas en la muestra).</li>
        </ul>

        <h3>Hoja de ruta</h3>
        <ul>
          <li><strong>Fase 1 (actual)</strong>: sitio estático en GitHub Pages, grafo pre-calculado, datos semilla con fuentes.</li>
          <li><strong>Fase 1.5</strong>: scraper de directorios y gerencias desde SMV/BVL (<code>etl/scraper_directorios.py</code>) — la SMV bloquea tráfico de centros de datos, así que debe correrse desde una conexión local en el Perú.</li>
          <li><strong>Fase 2</strong>: hechos de importancia, series temporales (evolución de la red), API FastAPI + Neo4j para consultas de rutas indirectas entre grupos.</li>
        </ul>

        <h3>Por qué importa</h3>
        <p>
          La información existe — la SMV y la BVL la publican — pero dispersa en cientos de PDFs y
          formularios. Volverla un grafo navegable convierte transparencia formal en transparencia
          real: directores compartidos, holdings bisagra y concentración sectorial se ven de un
          vistazo. Este observatorio no acusa a nadie: <strong>muestra la estructura</strong>, con
          fuentes, para que cualquiera la verifique.
        </p>
      </div>
    </section>
  )
}
