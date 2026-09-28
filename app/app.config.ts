const FOCUS_WITHIN = 'has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--c-focus)'
const NO_TRUNCATE = 'whitespace-normal overflow-visible text-clip'

export default defineAppConfig({
  appName: 'Turnos Accesibles',
  ui: {
    colors: { primary: 'blue', neutral: 'slate' },

    button: {
      slots: {
        base: 'min-h-12 min-w-12 justify-center',
        label: `${NO_TRUNCATE} text-center`,
      },
      variants: {
        size: {
          lg: { base: 'px-4 py-2 text-base gap-2', leadingIcon: 'size-6', trailingIcon: 'size-6' },
          xl: { base: 'min-h-14 px-5 py-3 text-lg font-bold gap-3', leadingIcon: 'size-7', trailingIcon: 'size-7' },
        },
      },
      defaultVariants: { size: 'xl', color: 'neutral', variant: 'outline' },
    },

    input: {
      slots: { base: 'min-h-14 text-lg' },
      defaultVariants: { size: 'xl' },
    },

    textarea: {
      slots: { base: 'text-lg resize-none' },
      defaultVariants: { size: 'xl' },
    },

    formField: {
      slots: {
        label: 'text-lg font-bold',
        description: 'text-base',
        hint: 'text-base',
        help: 'text-base',
        error: 'text-base font-bold',
      },
      defaultVariants: { size: 'xl' },
    },

    radioGroup: {
      slots: {
        fieldset: 'min-w-0',
        legend: 'text-lg font-bold mb-3',
        item: `min-h-16 items-center p-3 border-2 rounded-md has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/10 ${FOCUS_WITHIN}`,
        container: 'h-auto',
        base: 'ring-2',
        wrapper: 'ms-3 min-w-0',
        label: 'text-lg font-bold',
        description: 'text-base',
        icon: 'size-8',
      },
      variants: {
        size: {
          xl: { fieldset: 'gap-y-3', base: 'size-7', indicator: 'after:size-3', item: 'text-lg', legend: 'text-lg' },
        },
      },
      defaultVariants: { variant: 'card', size: 'xl', orientation: 'vertical' },
    },

    checkbox: {
      slots: {
        root: `min-h-16 items-center p-3 border-2 rounded-md has-data-[state=checked]:border-primary ${FOCUS_WITHIN}`,
        container: 'h-auto',
        base: 'ring-2',
        wrapper: 'ms-3 min-w-0',
        label: 'text-lg',
        description: 'text-base',
      },
      variants: {
        size: {
          xl: { base: 'size-7', icon: 'size-6', wrapper: 'text-lg' },
        },
      },
      defaultVariants: { size: 'xl', variant: 'card' },
    },

    switch: {
      slots: {
        root: 'min-h-12 items-center',
        base: 'ring-2 ring-inset ring-(--c-border)',
        wrapper: 'ms-3 min-w-0',
        label: 'text-lg',
        description: 'text-base',
      },
      variants: {
        size: {
          xl: {
            base: 'w-23',
            container: 'h-12',
            thumb: 'size-11 data-[state=checked]:translate-x-11 data-[state=checked]:rtl:-translate-x-11',
            wrapper: 'text-lg',
          },
        },
      },
      defaultVariants: { size: 'xl', color: 'primary' },
    },

    badge: {
      slots: {
        base: 'font-bold',
        label: NO_TRUNCATE,
      },
      variants: {
        size: {
          xl: { base: 'px-3 py-1.5 text-base gap-2 ring-2', leadingIcon: 'size-6' },
        },
      },
      defaultVariants: { size: 'xl', variant: 'outline' },
    },

    alert: {
      slots: {
        root: 'p-5 gap-4 ring-2',
        title: 'text-lg font-bold',
        description: 'text-base opacity-100',
        icon: 'size-8',
      },
      defaultVariants: { variant: 'outline' },
    },

    progress: {
      slots: { base: 'ring-2 ring-inset ring-(--c-border)' },
      defaultVariants: { size: 'lg' },
    },
  },
})
