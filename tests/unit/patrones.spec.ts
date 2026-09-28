import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { axe } from './axe'
import EstadoBadge from '~/components/turnos/EstadoBadge.vue'
import AccionesPaso from '~/components/patrones/AccionesPaso.vue'
import VistaEstados from '~/components/patrones/VistaEstados.vue'
import OpcionesTarjeta from '~/components/patrones/OpcionesTarjeta.vue'
import AsistentePaso from '~/components/asistente/AsistentePaso.vue'

function setPlainLanguage(value: boolean) {
  useAccesibilidadStore(useNuxtApp().$pinia).set('plainLanguage', value)
}

describe('EstadoBadge', () => {
  it('muestra texto e ícono, no solo color', async () => {
    const wrapper = await mountSuspended(EstadoBadge, { props: { estado: 'cancelada' } })
    expect(wrapper.text()).toBe('Cancelado')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('con un estado desconocido muestra el valor crudo en vez de romper', async () => {
    const wrapper = await mountSuspended(EstadoBadge, { props: { estado: 'nuevo-estado' } })
    expect(wrapper.text()).toBe('nuevo-estado')
  })

  it('no tiene violaciones de axe', async () => {
    const wrapper = await mountSuspended(EstadoBadge, { props: { estado: 'disponible' } })
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })
})

describe('AccionesPaso', () => {
  it('usa los textos en lenguaje simple por defecto', async () => {
    const wrapper = await mountSuspended(AccionesPaso)
    const labels = wrapper.findAll('button').map((b) => b.text())
    expect(labels).toEqual(['Sí, continuar', 'Volver atrás'])
  })

  it('cambia los textos si se apaga el lenguaje simple', async () => {
    setPlainLanguage(false)
    const wrapper = await mountSuspended(AccionesPaso)
    expect(wrapper.findAll('button').map((b) => b.text())).toEqual(['Continuar', 'Volver'])
    setPlainLanguage(true)
  })

  it('emite confirmar y volver', async () => {
    const wrapper = await mountSuspended(AccionesPaso)
    const [confirmar, volver] = wrapper.findAll('button')
    await confirmar!.trigger('click')
    await volver!.trigger('click')
    expect(wrapper.emitted('confirmar')).toHaveLength(1)
    expect(wrapper.emitted('volver')).toHaveLength(1)
  })

  it('puede no mostrar el volver', async () => {
    const wrapper = await mountSuspended(AccionesPaso, { props: { sinVolver: true } })
    expect(wrapper.findAll('button')).toHaveLength(1)
  })

  it('no tiene violaciones de axe', async () => {
    const wrapper = await mountSuspended(AccionesPaso)
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })
})

describe('VistaEstados', () => {
  const CASOS = [
    ['cargando', 'Estamos buscando. Esperá un momento.'],
    ['vacio', 'No encontramos nada por ahora.'],
    ['error', 'Algo no funcionó.Probá de nuevo en un momento.'],
    ['sin-permiso', 'No podés ver esta página.Volvé al inicio para seguir.'],
  ] as const

  for (const [estado, texto] of CASOS) {
    it(`en ${estado} dice qué pasa y no tiene violaciones de axe`, async () => {
      const wrapper = await mountSuspended(VistaEstados, { props: { estado } })
      expect(wrapper.text()).toContain(texto)
      expect(await axe(wrapper.element)).toHaveNoViolations()
    })
  }

  it('en contenido muestra el slot', async () => {
    const wrapper = await mountSuspended(VistaEstados, {
      props: { estado: 'contenido' },
      slots: { default: () => 'Los turnos' },
    })
    expect(wrapper.text()).toBe('Los turnos')
  })

  it('marca aria-busy mientras carga', async () => {
    const wrapper = await mountSuspended(VistaEstados, { props: { estado: 'cargando' } })
    expect(wrapper.attributes('aria-busy')).toBe('true')
  })

  it('el error ofrece reintentar', async () => {
    const wrapper = await mountSuspended(VistaEstados, { props: { estado: 'error' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('reintentar')).toHaveLength(1)
  })

  it('anuncia el error en la región assertive', async () => {
    const wrapper = await mountSuspended(VistaEstados, { props: { estado: 'contenido' } })
    await wrapper.setProps({ estado: 'error' })
    await nextTick()
    await nextTick()
    expect(useAnuncio().assertive.value).toBe('Algo no funcionó. Probá de nuevo en un momento.')
  })
})

describe('OpcionesTarjeta', () => {
  const OPCIONES = [
    { value: 'oftalmologia', label: 'Oculista', description: 'Oftalmología', icon: 'i-lucide-eye' },
    { value: 'cardiologia', label: 'Cardiólogo', description: 'Cardiología', icon: 'i-lucide-heart-pulse' },
  ]

  it('muestra el nombre común, el técnico y el ícono', async () => {
    const wrapper = await mountSuspended(OpcionesTarjeta, { props: { legend: '¿Qué médico necesitás?', opciones: OPCIONES } })
    expect(wrapper.get('legend').text()).toBe('¿Qué médico necesitás?')
    expect(wrapper.text()).toContain('Oculista')
    expect(wrapper.text()).toContain('Oftalmología')
    expect(wrapper.findAll('[data-slot="label"] svg')).toHaveLength(2)
  })

  it('cambia el modelo al elegir', async () => {
    const wrapper = await mountSuspended(OpcionesTarjeta, { props: { legend: 'Médico', opciones: OPCIONES } })
    await wrapper.findAll('[role="radio"]')[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['cardiologia'])
  })

  it('no tiene violaciones de axe', async () => {
    const wrapper = await mountSuspended(OpcionesTarjeta, { props: { legend: 'Médico', opciones: OPCIONES } })
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })
})

describe('AsistentePaso', () => {
  const props = { paso: 2, total: 6, titulo: '¿Dónde te queda cómodo?', descripcion: 'Elegí una opción.' }

  it('muestra el progreso en texto', async () => {
    const wrapper = await mountSuspended(AsistentePaso, { props })
    expect(wrapper.text()).toContain('Paso 2 de 6')
  })

  it('al montar mueve el foco al título y anuncia el paso', async () => {
    const wrapper = await mountSuspended(AsistentePaso, { props, attachTo: document.body })
    expect(document.activeElement).toBe(wrapper.get('h1').element)
    await nextTick()
    expect(useAnuncio().polite.value).toBe('Paso 2 de 6')
    wrapper.unmount()
  })

  it('al cambiar de paso vuelve a llevar el foco al título', async () => {
    const wrapper = await mountSuspended(AsistentePaso, { props, attachTo: document.body })
    ;(document.body as HTMLElement).focus()
    await wrapper.setProps({ paso: 3, titulo: '¿Cuándo podés ir?' })
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('h1').element)
    wrapper.unmount()
  })

  it('no tiene violaciones de axe', async () => {
    const wrapper = await mountSuspended(AsistentePaso, { props })
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })
})
