export const rutaSegura = (valor: unknown, porDefecto = '/inicio') =>
  typeof valor === 'string' && valor.startsWith('/') && !valor.startsWith('//') ? valor : porDefecto
