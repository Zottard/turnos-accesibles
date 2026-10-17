// Perfil de la persona que ingresó (tabla `perfiles`). El rol y el correo no se cambian desde acá.

export type Perfil = {
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  telefono: string
  localidad: string
  rol: 'solicitante' | 'acompanante' | 'admin'
}

export type DatosPerfil = Omit<Perfil, 'rol'>

export function usePerfil() {
  const supabase = useSupabaseClient()
  const usuario = useSupabaseUser()

  /** Devuelve { datos, error }: datos es null si no se pudo leer. */
  async function cargarPerfil(): Promise<{ datos: Perfil | null; error: string | null }> {
    const id = usuario.value?.sub
    if (!id) {
      return { datos: null, error: 'Para ver tu perfil, primero ingresá con tu cuenta.' }
    }
    const { data, error } = await supabase
      .from('perfiles')
      .select('nombre, apellido, dni, fecha_nacimiento, telefono, localidad, rol')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) {
      return { datos: null, error: 'No pudimos traer tus datos. Probá de nuevo en un rato.' }
    }
    return {
      datos: {
        nombre: data.nombre ?? '',
        apellido: data.apellido ?? '',
        dni: data.dni ?? '',
        fechaNacimiento: data.fecha_nacimiento ?? '',
        telefono: data.telefono ?? '',
        localidad: data.localidad ?? '',
        // La base solo acepta estos tres valores (check en la migración).
        rol: data.rol as Perfil['rol'],
      },
      error: null,
    }
  }

  async function guardarPerfil(datos: DatosPerfil): Promise<Resultado> {
    const id = usuario.value?.sub
    if (!id) {
      return { ok: false, mensaje: 'Se cerró tu sesión. Ingresá de nuevo para guardar los cambios.' }
    }
    const { error } = await supabase
      .from('perfiles')
      .update({
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        dni: limpiarDni(datos.dni),
        fecha_nacimiento: datos.fechaNacimiento,
        telefono: limpiarTelefono(datos.telefono),
        localidad: datos.localidad.trim(),
      })
      .eq('id', id)
    if (error) {
      return { ok: false, mensaje: 'No pudimos guardar los cambios. Tus datos anteriores siguen igual.' }
    }
    return { ok: true }
  }

  return { cargarPerfil, guardarPerfil }
}
