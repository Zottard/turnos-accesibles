const BORRADOR_VACIO = {
  paso: 0,
  editandoDesdeResumen: false,
  nombre: '',
  apellido: '',
  documento: '',
  dia: '',
  mes: '',
  anio: '',
  localidad: 0,
  email: '',
}

export type BorradorRegistro = typeof BORRADOR_VACIO

export function useRegistro() {
  const borrador = useSessionStorage<BorradorRegistro>('ta_registro', { ...BORRADOR_VACIO }, { initOnMounted: true, mergeDefaults: true })
  const clave = useState('registro-clave', () => '')

  function descartar() {
    borrador.value = { ...BORRADOR_VACIO }
    clave.value = ''
  }

  return { borrador, clave, descartar }
}
