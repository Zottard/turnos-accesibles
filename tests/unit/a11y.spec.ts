import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { axe } from './axe'
import SkipLink from '~/components/a11y/SkipLink.vue'
import LiveRegion from '~/components/a11y/LiveRegion.vue'

describe('SkipLink', () => {
  it('apunta al contenido principal', async () => {
    const wrapper = await mountSuspended(SkipLink)
    expect(wrapper.attributes('href')).toBe('#contenido')
    expect(wrapper.text()).toBe('Saltar al contenido principal')
  })

  it('no tiene violaciones de axe', async () => {
    const wrapper = await mountSuspended(SkipLink)
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })
})

describe('LiveRegion', () => {
  it('anuncia lo que se empuja con useAnuncio', async () => {
    const wrapper = await mountSuspended(LiveRegion)
    const { announce, alert } = useAnuncio()

    await announce('Paso 2 de 6')
    await alert('Ese turno lo tomó otra persona.')
    await nextTick()

    expect(wrapper.get('[aria-live="polite"]').text()).toBe('Paso 2 de 6')
    expect(wrapper.get('[aria-live="assertive"]').text()).toBe('Ese turno lo tomó otra persona.')
  })

  it('no tiene violaciones de axe', async () => {
    const wrapper = await mountSuspended(LiveRegion)
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })
})

describe('useAccesibilidad', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('arranca con el perfil accesible por defecto', () => {
    const { htmlAttrs } = useAccesibilidad()
    expect(htmlAttrs.value).toEqual({
      'data-theme': 'alto-contraste',
      'data-text-scale': '125',
      'data-reduce-motion': 'true',
    })
  })

  it('cambia los atributos al cambiar una preferencia', () => {
    const { htmlAttrs, set } = useAccesibilidad()
    set('contrast', 'normal')
    set('textScale', '200')
    expect(htmlAttrs.value['data-theme']).toBe('claro')
    expect(htmlAttrs.value['data-text-scale']).toBe('200')
  })
})
