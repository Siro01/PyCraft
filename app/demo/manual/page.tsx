import Manual from './Manual'

export const metadata = { title: 'Manual de marca · PyCraft BOSSRUSH' }

// Contrato de dirección (Impeccable): queda en el HTML para poder auditarlo.
const CONTRACT = `<!-- impeccable:direction
THESIS: El manual de marca se recorre como el mapa de actos: cada sección es una parada del camino; rechaza el manual corporativo de índice + páginas de texto.
OWN-WORLD: PyCraft OS 1-bit. Fondo de puntos, ventanas de 2px con barra sólida o tramada, sombra dura sin blur, nodos cuadrado-en-cuadrado, rutas en ángulo recto, terreno tramado, Jersey 25 / VT323 / Silkscreen, tokens de los 3 temas.
STORY: El docente entiende qué es PyCraft visualmente, encuentra la ficha de cada personaje/jefe/lugar y ve qué falta para que todo sea coherente.
FIRST VIEWPORT: Portada A4 apaisada = mapa del manual a página completa; título pixel arriba a la izquierda, LEEME.TXT arriba a la derecha, 10 paradas con nombre y página, el avatar del alumno parado en Portada, cofre del Anexo al final de un sendero punteado. Páginas interiores: riel del recorrido arriba con el avatar en la sección actual.
FORM: El recorrido del mapa, estructura 7 de 7 de la lista; seed eb4a7b4b.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`

export default function ManualPage() {
  return (
    <>
      <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
      <Manual />
    </>
  )
}
