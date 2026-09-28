import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { axe } from './axe'
import ReadAloudButton from '~/components/a11y/ReadAloudButton.vue'
import VoiceInputButton from '~/components/a11y/VoiceInputButton.vue'

describe('ReadAloudButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sin síntesis de voz avisa la limitación y ofrece agrandar la letra', async () => {
    const wrapper = await mountSuspended(ReadAloudButton, { props: { text: 'Hola' } })
    await nextTick()
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toContain('Tu navegador no puede leer en voz alta')
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })

  it('con síntesis de voz lee el texto en español', async () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [] })
    vi.stubGlobal('SpeechSynthesisUtterance', class { lang = ''; rate = 1; constructor(public text: string) {} })

    const wrapper = await mountSuspended(ReadAloudButton, { props: { text: 'Tu turno es el martes' } })
    await nextTick()
    await wrapper.get('button').trigger('click')

    expect(speak).toHaveBeenCalledOnce()
    expect(speak.mock.calls[0]![0]).toMatchObject({ text: 'Tu turno es el martes', lang: 'es-AR', rate: 1 })
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })
})

describe('VoiceInputButton', () => {
  it('sin reconocimiento de voz no se muestra', async () => {
    const wrapper = await mountSuspended(VoiceInputButton)
    await nextTick()
    expect(wrapper.find('button').exists()).toBe(false)
  })
})

describe('useLenguajeSimple', () => {
  it('reemplaza los parámetros', async () => {
    const { t } = useLenguajeSimple()
    expect(t('progreso.paso', { actual: 3, total: 6 })).toBe('Paso 3 de 6')
  })
})
