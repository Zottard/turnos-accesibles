<!--
  Métricas y reportes (RF-09): indicadores del período, agrupados por día, centro, especialidad o
  localidad. Tarjetas con el resumen, un gráfico de barras (solo visual, aria-hidden) y una tabla con
  los mismos números. Se exporta a planilla (CSV para Excel) y a PDF (imprimir).
  - Sin datos en el período: lo decimos y no armamos el reporte.
  - Si falla una exportación, el reporte sigue en pantalla y avisamos el error.
  El período va en la dirección (?desde=&hasta=&agrupar=): se puede recargar o compartir.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Métricas y reportes' })

const route = useRoute()
const router = useRouter()
const { cargarMetricas } = useAdmin()
const { anunciar } = useAnuncio()

const hoy = fechaClave(new Date())

// --- Lo que se está mostrando: sale de la dirección (por defecto, los últimos 30 días por día) ---
const pedido = computed(() => {
  const porDefecto = rangoUltimosDias(30, hoy)
  const desde = typeof route.query.desde === 'string' && esFechaValida(route.query.desde) ? route.query.desde : porDefecto.desde
  const hasta = typeof route.query.hasta === 'string' && esFechaValida(route.query.hasta) ? route.query.hasta : porDefecto.hasta
  const agrupar = AGRUPACIONES.find((opcion) => opcion.valor === route.query.agrupar)?.valor ?? 'dia'
  return { desde, hasta, agrupar: agrupar as Agrupar }
})

const { data: reporte, refresh } = await useAsyncData('admin-metricas', async () => {
  const { desde, hasta, agrupar } = pedido.value
  const respuesta = await cargarMetricas(desde, hasta, agrupar)
  return { ...respuesta, generadoEn: new Date().toISOString() }
})

const datos = computed(() => reporte.value?.datos ?? null)
const filas = computed(() => {
  if (!datos.value) return []
  return pedido.value.agrupar === 'dia'
    ? completarDias(datos.value.filas, pedido.value.desde, pedido.value.hasta)
    : datos.value.filas
})
const nombreAgrupacion = computed(() => AGRUPACIONES.find((opcion) => opcion.valor === pedido.value.agrupar)!.titulo)
const textoPeriodo = computed(
  () => `del ${diaDeCampoEnPalabras(pedido.value.desde)} al ${diaDeCampoEnPalabras(pedido.value.hasta)}`,
)

// --- Formulario: período y agrupación ---
type OpcionPeriodo = '7' | '30' | 'elegir'
function opcionDelPedido(): OpcionPeriodo {
  const { desde, hasta } = pedido.value
  if (hasta === hoy && desde === rangoUltimosDias(7, hoy).desde) return '7'
  if (hasta === hoy && desde === rangoUltimosDias(30, hoy).desde) return '30'
  return 'elegir'
}
const formulario = reactive({
  periodo: opcionDelPedido() as string | number | undefined,
  desde: pedido.value.desde,
  hasta: pedido.value.hasta,
  agrupar: pedido.value.agrupar as string | number | undefined,
})
const OPCIONES_PERIODO = [
  { valor: '7', titulo: 'Últimos 7 días' },
  { valor: '30', titulo: 'Últimos 30 días' },
  { valor: 'elegir', titulo: 'Elegir las fechas' },
]
const errorPeriodo = ref<{ campo: 'desde' | 'hasta'; mensaje: string } | undefined>()

async function verReporte() {
  errorPeriodo.value = undefined
  let rango = { desde: formulario.desde, hasta: formulario.hasta }
  if (formulario.periodo === '7' || formulario.periodo === '30') {
    rango = rangoUltimosDias(Number(formulario.periodo), hoy)
  } else {
    errorPeriodo.value = validarPeriodo(formulario.desde, formulario.hasta, hoy)
    if (errorPeriodo.value) {
      document.getElementById(`metricas-${errorPeriodo.value.campo}`)?.focus()
      return
    }
  }
  const query = { desde: rango.desde, hasta: rango.hasta, agrupar: String(formulario.agrupar ?? 'dia') }
  if (JSON.stringify(query) === JSON.stringify(pedido.value)) {
    await refresh()
    await avisarReporte()
  } else {
    await router.push({ query })
  }
}

watch(pedido, async () => {
  await refresh()
  await avisarReporte()
})

async function avisarReporte() {
  await nextTick()
  document.getElementById('titulo-reporte')?.focus()
  if (reporte.value?.error) anunciar(reporte.value.error, true)
  else if (!datos.value?.hayDatos) anunciar('No hay datos para este período.')
  else anunciar(`Reporte ${textoPeriodo.value}, ${nombreAgrupacion.value.toLowerCase()}.`)
}

// --- Gráfico ---
const maximoGrafico = computed(() => Math.max(0, ...filas.value.map((fila) => Math.max(fila.buscados, fila.reservados))))

// --- Exportar ---
const errorExportar = ref('')

function descargarCsv() {
  errorExportar.value = ''
  try {
    if (!datos.value) throw new Error('sin datos')
    const contenido = csvDeMetricas({ ...datos.value, filas: filas.value }, pedido.value.agrupar)
    const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreArchivoReporte(pedido.value.desde, pedido.value.hasta, 'csv')
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    anunciar('Listo: descargamos la planilla.')
  } catch {
    errorExportar.value = 'No pudimos descargar la planilla. El reporte sigue en pantalla: probá de nuevo.'
    anunciar(errorExportar.value, true)
  }
}

function imprimir() {
  errorExportar.value = ''
  try {
    window.print()
  } catch {
    errorExportar.value = 'No pudimos abrir la impresión. El reporte sigue en pantalla: probá de nuevo.'
    anunciar(errorExportar.value, true)
  }
}
</script>

<template>
  <div class="contenedor pagina">
    <NavPanel />
    <h1>Métricas y reportes</h1>
    <p class="pagina__bajada no-imprimir">
      Cuántos turnos se buscan, se reservan y se cumplen, y cuánta gente los saca sola o con ayuda.
    </p>

    <!-- Período y agrupación -->
    <form class="tarjeta pila no-imprimir formulario-metricas" novalidate @submit.prevent="verReporte">
      <fieldset>
        <legend>Período</legend>
        <div class="opciones">
          <OpcionTarjeta
            v-for="opcion in OPCIONES_PERIODO"
            :key="opcion.valor"
            v-model="formulario.periodo"
            nombre="metricas-periodo"
            :valor="opcion.valor"
            :titulo="opcion.titulo"
          />
        </div>
      </fieldset>
      <div v-if="formulario.periodo === 'elegir'" class="fechas">
        <Campo
          id="metricas-desde"
          v-model="formulario.desde"
          etiqueta="Desde el día"
          type="date"
          requerido
          :error="errorPeriodo?.campo === 'desde' ? errorPeriodo.mensaje : undefined"
        />
        <Campo
          id="metricas-hasta"
          v-model="formulario.hasta"
          etiqueta="Hasta el día"
          type="date"
          requerido
          :error="errorPeriodo?.campo === 'hasta' ? errorPeriodo.mensaje : undefined"
        />
      </div>
      <fieldset>
        <legend>Cómo agrupar</legend>
        <div class="opciones">
          <OpcionTarjeta
            v-for="opcion in AGRUPACIONES"
            :key="opcion.valor"
            v-model="formulario.agrupar"
            nombre="metricas-agrupar"
            :valor="opcion.valor"
            :titulo="opcion.titulo"
          />
        </div>
      </fieldset>
      <div>
        <Boton type="submit"><span aria-hidden="true">📊</span> Ver el reporte</Boton>
      </div>
    </form>

    <!-- El reporte -->
    <section class="pila reporte" aria-labelledby="titulo-reporte">
      <!-- Encabezado del PDF -->
      <div class="solo-imprimir encabezado-reporte">
        <p><strong>Turnos Accesibles — Reporte de uso</strong></p>
        <p>Período: {{ textoPeriodo }}. {{ nombreAgrupacion }}.</p>
        <p v-if="reporte?.generadoEn">Generado el {{ momentoEnPalabras(reporte.generadoEn) }}.</p>
        <p>Datos de prueba: los centros, profesionales y reservas anteriores son inventados.</p>
      </div>

      <h2 id="titulo-reporte" tabindex="-1">Reporte {{ textoPeriodo }}</h2>

      <Aviso v-if="reporte?.error" tipo="error">
        <p>{{ reporte.error }}</p>
      </Aviso>
      <Aviso v-else-if="datos && !datos.hayDatos" tipo="info" titulo="No hay datos para este período">
        <p>No hubo búsquedas ni reservas en esas fechas, así que no armamos el reporte. Probá con otras fechas.</p>
      </Aviso>

      <template v-else-if="datos">
        <div class="acciones no-imprimir">
          <Boton variante="secundario" @click="descargarCsv"><span aria-hidden="true">⬇</span> Descargar planilla (CSV)</Boton>
          <Boton variante="secundario" @click="imprimir"><span aria-hidden="true">🖨</span> Imprimir o guardar como PDF</Boton>
        </div>
        <Aviso v-if="errorExportar" tipo="error">
          <p>{{ errorExportar }}</p>
        </Aviso>

        <!-- Resumen -->
        <dl class="resumen">
          <div class="tarjeta dato">
            <dt>Turnos buscados</dt>
            <dd>{{ datos.resumen.buscados }}</dd>
          </div>
          <div class="tarjeta dato">
            <dt>Turnos reservados</dt>
            <dd>{{ datos.resumen.reservados }}</dd>
          </div>
          <div class="tarjeta dato">
            <dt>Cancelados</dt>
            <dd>{{ datos.resumen.cancelados }}</dd>
          </div>
          <div class="tarjeta dato">
            <dt>Cambiados de fecha</dt>
            <dd>{{ datos.resumen.reprogramados }}</dd>
          </div>
          <div class="tarjeta dato">
            <dt>Cumplidos</dt>
            <dd>{{ datos.resumen.completados }}</dd>
          </div>
          <div class="tarjeta dato">
            <dt>Tiempo promedio para reservar</dt>
            <dd class="dato__texto">{{ segundosEnPalabras(datos.resumen.segundos_promedio) }}</dd>
          </div>
          <div class="tarjeta dato dato--ancho">
            <dt>Quién hizo la reserva</dt>
            <dd class="dato__texto">
              {{ porcentaje(datos.resumen.autonomas, datos.resumen.autonomas + datos.resumen.asistidas) }} % la persona sola
              ({{ datos.resumen.autonomas }})<br />
              {{ porcentaje(datos.resumen.asistidas, datos.resumen.autonomas + datos.resumen.asistidas) }} % con su acompañante
              ({{ datos.resumen.asistidas }})
            </dd>
          </div>
        </dl>

        <section v-if="Object.keys(datos.resumen.uso).length > 0" class="tarjeta pila uso" aria-labelledby="titulo-uso">
          <h3 id="titulo-uso">Uso de la accesibilidad y del modo acompañante</h3>
          <ul>
            <li v-for="(cantidad, tipo) in datos.resumen.uso" :key="tipo">
              {{ NOMBRES_USO[tipo] ?? tipo }}: <strong>{{ cantidad }}</strong>
            </li>
          </ul>
        </section>

        <!-- Gráfico: solo visual. Los mismos números están en la tabla. -->
        <figure class="grafico" aria-hidden="true">
          <figcaption>
            <span class="leyenda leyenda--buscados"></span> Buscados
            <span class="leyenda leyenda--reservados"></span> Reservados
          </figcaption>
          <div v-for="fila in filas" :key="fila.clave" class="grafico__fila">
            <span class="grafico__etiqueta">{{ etiquetaFila(fila.clave, pedido.agrupar) }}</span>
            <span class="grafico__barras">
              <span class="barra barra--buscados" :style="{ width: `${anchoBarra(fila.buscados, maximoGrafico)}%` }"></span>
              <span class="barra barra--reservados" :style="{ width: `${anchoBarra(fila.reservados, maximoGrafico)}%` }"></span>
            </span>
          </div>
        </figure>
        <p class="texto-suave no-imprimir">El gráfico muestra los buscados y reservados de la tabla.</p>

        <!-- Tabla con los mismos números -->
        <div class="tabla-scroll" role="region" aria-labelledby="titulo-tabla" tabindex="0">
          <table class="tabla">
            <caption id="titulo-tabla">Métricas {{ textoPeriodo }}, {{ nombreAgrupacion.toLowerCase() }}</caption>
            <thead>
              <tr>
                <th scope="col">{{ nombreAgrupacion.replace('Por ', '').replace(/^./, (letra) => letra.toUpperCase()) }}</th>
                <th v-for="columna in COLUMNAS_METRICAS" :key="columna.clave" scope="col">{{ columna.titulo }}</th>
                <th scope="col">Tiempo promedio</th>
                <th scope="col">Solas</th>
                <th scope="col">Con acompañante</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="fila in filas" :key="fila.clave">
                <th scope="row">{{ etiquetaFila(fila.clave, pedido.agrupar) }}</th>
                <td v-for="columna in COLUMNAS_METRICAS" :key="columna.clave">{{ fila[columna.clave] }}</td>
                <td>{{ fila.segundos_promedio === null ? '—' : segundosEnPalabras(fila.segundos_promedio) }}</td>
                <td>{{ fila.autonomas }}</td>
                <td>{{ fila.asistidas }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td v-for="columna in COLUMNAS_METRICAS" :key="columna.clave">{{ datos.resumen[columna.clave] }}</td>
                <td>{{ segundosEnPalabras(datos.resumen.segundos_promedio) }}</td>
                <td>{{ datos.resumen.autonomas }}</td>
                <td>{{ datos.resumen.asistidas }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p class="texto-suave">
          Los datos son anónimos. "Cumplidos": turnos confirmados cuya fecha ya pasó. Datos de prueba: las reservas
          anteriores a hoy son inventadas para mostrar el tablero.
        </p>
      </template>
    </section>
  </div>
</template>

<style scoped>
.formulario-metricas {
  max-width: 48rem;
}

.opciones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
}

.fechas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: var(--espacio-3);
}

.reporte {
  margin-top: var(--espacio-4);
}

/* --- Resumen --- */
.resumen {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 13rem), 1fr));
  gap: var(--espacio-3);
}

.dato {
  border-top-color: var(--exito);
}

.dato--ancho {
  grid-column: span 2;
}

@media (max-width: 40rem) {
  .dato--ancho {
    grid-column: auto;
  }
}

.dato dt {
  font-family: var(--fuente-titulos);
  font-weight: 600;
}

.dato dd {
  margin: 0;
  font-family: var(--fuente-titulos);
  font-size: 2rem;
  font-weight: 800;
}

.dato .dato__texto {
  font-size: 1.1rem;
  font-weight: 700;
}

.uso ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: var(--espacio-1) var(--espacio-4);
}

/* --- Gráfico --- */
.grafico {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
  padding: var(--relleno-tarjeta);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-radius: var(--radio-tarjeta);
}

.grafico figcaption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-2);
  font-family: var(--fuente-titulos);
  font-weight: 600;
}

.leyenda {
  display: inline-block;
  width: 1.5rem;
  height: 1rem;
  border: 2px solid var(--primario);
  border-radius: 3px;
}

.leyenda--reservados {
  margin-left: var(--espacio-3);
  background: var(--exito);
  border-color: var(--exito);
}

.grafico__fila {
  display: grid;
  grid-template-columns: minmax(5rem, 14rem) 1fr;
  align-items: center;
  gap: var(--espacio-3);
}

.grafico__etiqueta {
  overflow-wrap: anywhere;
}

.grafico__barras {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.barra {
  display: block;
  min-width: 2px;
  height: 0.8rem;
  border-radius: 3px;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* Buscados: solo el borde. Reservados: lleno. Se distinguen también sin color. */
.barra--buscados {
  border: 2px solid var(--primario);
}

.barra--reservados {
  background: var(--exito);
}

@media (max-width: 30rem) {
  .grafico__fila {
    grid-template-columns: 1fr;
    gap: var(--espacio-1);
  }
}

/* --- Tabla --- */
.tabla-scroll {
  max-width: 100%;
  overflow-x: auto;
  border-radius: var(--radio-chico);
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  background: var(--superficie);
}

.tabla caption {
  padding-bottom: var(--espacio-2);
  font-family: var(--fuente-titulos);
  font-weight: 700;
  text-align: left;
}

.tabla th,
.tabla td {
  padding: var(--espacio-2);
  border: 1px solid var(--borde);
  text-align: right;
  overflow-wrap: normal;
  hyphens: none;
}

.tabla th[scope='row'],
.tabla thead th:first-child {
  text-align: left;
}

.tabla thead th {
  font-family: var(--fuente-titulos);
  background: var(--fondo-info);
}

.tabla tfoot th,
.tabla tfoot td {
  font-weight: 700;
  border-top: 3px solid var(--texto);
}

@media print {
  .encabezado-reporte {
    margin-bottom: 0.5rem;
  }

  .grafico {
    break-inside: avoid;
    border: 1px solid #000;
  }

  .barra--reservados {
    background: #555;
  }

  .tabla-scroll {
    overflow: visible;
  }

  .tabla th,
  .tabla td {
    border-color: #000;
    padding: 2px 4px;
  }

  .tabla tr {
    break-inside: avoid;
  }

  .dato dd {
    font-size: 1.4rem;
  }
}
</style>
