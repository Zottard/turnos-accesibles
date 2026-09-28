import { test as base } from '@playwright/test'

export { expect } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    const hidratada = () => page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__))
    const goto = page.goto.bind(page)
    const reload = page.reload.bind(page)
    page.goto = async (url, options) => {
      const respuesta = await goto(url, options)
      await hidratada()
      return respuesta
    }
    page.reload = async (options) => {
      const respuesta = await reload(options)
      await hidratada()
      return respuesta
    }
    await use(page)
  },
})
