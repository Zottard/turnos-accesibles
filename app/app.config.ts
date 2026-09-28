export default defineAppConfig({
  appName: 'Turnos Accesibles',
  ui: {
    colors: { primary: 'blue', neutral: 'slate' },
    button: {
      slots: { base: 'min-h-12 justify-center' },
      defaultVariants: { size: 'xl', color: 'neutral', variant: 'outline' },
    },
    input: { defaultVariants: { size: 'xl' } },
  },
})
