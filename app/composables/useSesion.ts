import type { Tables } from '~/types/database'

export type Perfil = Tables<'profiles'>

export interface Aviso {
  titulo: string
  ayuda: string
}

export interface DatosRegistro {
  nombre: string
  apellido: string
  documento: string
  fechaNacimiento: string
  localidad: string
  localidadId: number
  email: string
  clave: string
}

type Resultado<M extends string = string> = { ok: true } | { ok: false, motivo: M, aviso: Aviso }

const SIN_CONEXION: Aviso = {
  titulo: 'No pudimos conectarnos.',
  ayuda: 'Revisá tu conexión a internet y probá de nuevo.',
}

const DEMASIADOS_CORREOS: Aviso = {
  titulo: 'Mandamos muchos correos seguidos.',
  ayuda: 'Esperá unos minutos y probá de nuevo.',
}

const DEMASIADOS_INTENTOS: Aviso = {
  titulo: 'Hubo muchos intentos seguidos desde esta conexión.',
  ayuda: 'Esperá unos minutos y probá de nuevo.',
}

function avisoGeneral(error: { code?: string }): Aviso {
  if (error.code === 'over_email_send_rate_limit') return DEMASIADOS_CORREOS
  if (error.code === 'over_request_rate_limit') return DEMASIADOS_INTENTOS
  return SIN_CONEXION
}

const minutos = (segundos: number) => Math.max(1, Math.ceil(segundos / 60))

export function useSesion() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const perfil = useState<Perfil | null>('perfil', () => null)


  async function cargarPerfil(forzar = false) {
    const id = user.value?.sub
    if (!id) {
      perfil.value = null
      return null
    }
    if (perfil.value?.id === id && !forzar) return perfil.value
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    perfil.value = data
    return data
  }

  async function ingresar(email: string, clave: string): Promise<Resultado<'bloqueado' | 'credenciales' | 'sin-confirmar' | 'error'>> {
    const { data: espera, error: errorBloqueo } = await supabase.rpc('estado_bloqueo', { p_email: email })
    if (errorBloqueo) return { ok: false, motivo: 'error', aviso: SIN_CONEXION }
    if (espera > 0) return { ok: false, motivo: 'bloqueado', aviso: avisoBloqueo(espera) }

    const { error } = await supabase.auth.signInWithPassword({ email, password: clave })

    if (!error) {
      await supabase.rpc('limpiar_intentos')
      const { data } = await supabase.auth.getClaims()
      user.value = data?.claims ?? null
      await cargarPerfil(true)
      return { ok: true }
    }

    if (error.code === 'email_not_confirmed') {
      return {
        ok: false,
        motivo: 'sin-confirmar',
        aviso: {
          titulo: 'Todavía no confirmaste tu correo.',
          ayuda: 'Buscá el mensaje que te mandamos y tocá el enlace. Si no lo encontrás, te lo mandamos de nuevo.',
        },
      }
    }

    if (error.code === 'invalid_credentials') {
      const { data } = await supabase.rpc('registrar_fallo', { p_email: email })
      const { restantes = 0, bloqueado_segundos = 0 } = (data ?? {}) as { restantes?: number, bloqueado_segundos?: number }
      if (bloqueado_segundos > 0) return { ok: false, motivo: 'bloqueado', aviso: avisoBloqueo(bloqueado_segundos) }
      return {
        ok: false,
        motivo: 'credenciales',
        aviso: {
          titulo: 'El correo o la contraseña no coinciden.',
          ayuda: restantes <= 2
            ? `Probá de nuevo. Te ${restantes === 1 ? 'queda 1 intento' : `quedan ${restantes} intentos`}. Si no te acordás la contraseña, podés crear una nueva.`
            : 'Probá de nuevo. Si no te acordás la contraseña, podés crear una nueva.',
        },
      }
    }

    return { ok: false, motivo: 'error', aviso: avisoGeneral(error) }
  }

  function avisoBloqueo(segundos: number): Aviso {
    const m = minutos(segundos)
    return {
      titulo: 'Por seguridad, pausamos el ingreso con este correo.',
      ayuda: `Probaste varias veces con una contraseña que no coincide. Esperá ${m} ${m === 1 ? 'minuto' : 'minutos'} y probá de nuevo, o creá una contraseña nueva.`,
    }
  }

  async function registrar(datos: DatosRegistro): Promise<Resultado<'existe' | 'clave-debil' | 'error'>> {
    const { data, error } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.clave,
      options: {
        emailRedirectTo: `${window.location.origin}/confirmar-correo`,
        data: {
          nombre: datos.nombre,
          apellido: datos.apellido,
          documento: datos.documento,
          fecha_nacimiento: datos.fechaNacimiento,
          localidad: datos.localidad,
          localidad_id: datos.localidadId,
        },
      },
    })

    const existe = {
      ok: false as const,
      motivo: 'existe' as const,
      aviso: {
        titulo: 'Ya hay una cuenta con ese correo.',
        ayuda: 'Probá ingresar con ese correo. Si no te acordás la contraseña, podés crear una nueva.',
      },
    }

    if (error?.code === 'user_already_exists' || error?.code === 'email_exists') return existe
    if (error?.code === 'weak_password') {
      return {
        ok: false,
        motivo: 'clave-debil',
        aviso: { titulo: 'Esa contraseña es muy fácil de adivinar.', ayuda: 'Elegí otra más larga, con letras y números.' },
      }
    }
    if (error) return { ok: false, motivo: 'error', aviso: avisoGeneral(error) }
    if (data.user && data.user.identities?.length === 0) return existe
    return { ok: true }
  }

  async function reenviarConfirmacion(email: string): Promise<Resultado> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/confirmar-correo` },
    })
    return error ? { ok: false, motivo: 'error', aviso: avisoGeneral(error) } : { ok: true }
  }

  async function pedirNuevaClave(email: string): Promise<Resultado> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/restablecer-clave` })
    return error ? { ok: false, motivo: 'error', aviso: avisoGeneral(error) } : { ok: true }
  }

  async function cambiarClave(clave: string): Promise<Resultado> {
    const { error } = await supabase.auth.updateUser({ password: clave })
    if (error?.code === 'same_password') {
      return { ok: false, motivo: 'misma', aviso: { titulo: 'Esa es la contraseña que ya tenías.', ayuda: 'Elegí una distinta.' } }
    }
    if (error?.code === 'weak_password') {
      return { ok: false, motivo: 'clave-debil', aviso: { titulo: 'Esa contraseña es muy fácil de adivinar.', ayuda: 'Elegí otra más larga, con letras y números.' } }
    }
    return error ? { ok: false, motivo: 'error', aviso: avisoGeneral(error) } : { ok: true }
  }

  async function salir() {
    await supabase.auth.signOut()
    user.value = null
    perfil.value = null
  }

  return { user, perfil, cargarPerfil, ingresar, registrar, reenviarConfirmacion, pedirNuevaClave, cambiarClave, salir }
}
