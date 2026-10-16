// Cuenta de la persona: ingresar, registrarse, salir y recuperar la contraseña (Supabase Auth).
// Cada función devuelve { ok: true } o { ok: false, mensaje } con un mensaje en lenguaje simple:
// la página decide dónde mostrarlo.

// ofrecerRecuperar: mostrar el enlace para crear una contraseña nueva.
// ofrecerReenvio: mostrar el botón para mandar de nuevo el correo de activación.
export type Resultado =
  | { ok: true }
  | { ok: false; mensaje: string; ofrecerRecuperar?: boolean; ofrecerReenvio?: boolean }

export type Rol = 'solicitante' | 'acompanante'

export type DatosRegistro = {
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  correo: string
  telefono: string
  localidad: string
  rol: Rol
  clave: string
}

const MENSAJE_CREDENCIALES = 'El correo o la contraseña no coinciden. Revisalos y probá de nuevo.'
const MENSAJE_GENERAL = 'No pudimos conectarnos. Revisá tu conexión a internet y probá de nuevo.'

// Hora en formato argentino: "15:42".
function hora(fecha: string): string {
  return new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

function mensajeBloqueo(hasta: string): string {
  return (
    `Por seguridad, pausamos el ingreso con este correo hasta las ${hora(hasta)} ` +
    '(son 15 minutos). Si no te acordás la contraseña, podés crear una nueva.'
  )
}

// Traduce los errores de Supabase Auth que puede ver la persona. El resto es un error general.
function mensajeDeError(codigo: string | undefined): string {
  switch (codigo) {
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Hubo muchos intentos seguidos. Esperá unos minutos y probá de nuevo.'
    case 'weak_password':
      return 'Esa contraseña es fácil de adivinar. Probá con otra más larga, con letras y números.'
    case 'same_password':
      return 'La contraseña nueva tiene que ser distinta de la anterior.'
    case 'email_address_invalid':
      return 'No podemos usar ese correo. Revisalo o probá con otro.'
    case 'session_not_found':
    case 'session_expired':
      return 'Pasó mucho tiempo y se cerró la sesión. Pedí un enlace nuevo y probá otra vez.'
    default:
      return MENSAJE_GENERAL
  }
}

export function useSesion() {
  const supabase = useSupabaseClient()
  const usuario = useSupabaseUser()
  const cuenta = usePreferenciasCuenta()
  const origen = useRequestURL().origin

  const conSesion = computed(() => usuario.value !== null)

  // El módulo de Supabase actualiza el usuario un poco después de ingresar.
  // Lo hacemos ya, así el middleware lo ve en la próxima navegación.
  async function actualizarUsuario() {
    const { data } = await supabase.auth.getClaims()
    usuario.value = data?.claims ?? null
  }

  async function ingresar(correo: string, clave: string): Promise<Resultado> {
    const email = correo.trim().toLowerCase()

    const { data: bloqueadoHasta } = await supabase.rpc('estado_bloqueo', { p_correo: email })
    if (bloqueadoHasta) {
      return { ok: false, mensaje: mensajeBloqueo(bloqueadoHasta), ofrecerRecuperar: true }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
    if (error) {
      if (error.code === 'invalid_credentials') {
        const { data: hasta } = await supabase.rpc('registrar_fallo', { p_correo: email })
        if (hasta) {
          return { ok: false, mensaje: mensajeBloqueo(hasta), ofrecerRecuperar: true }
        }
        return { ok: false, mensaje: MENSAJE_CREDENCIALES, ofrecerRecuperar: true }
      }
      if (error.code === 'email_not_confirmed') {
        return {
          ok: false,
          mensaje:
            'Todavía no activaste tu cuenta. Abrí el correo que te mandamos y tocá el enlace. ' +
            'Si no lo encontrás, te lo mandamos de nuevo.',
          ofrecerReenvio: true,
        }
      }
      return { ok: false, mensaje: mensajeDeError(error.code) }
    }

    await supabase.rpc('limpiar_intentos')
    await actualizarUsuario()
    cuenta.olvidar()
    await cuenta.cargar()
    return { ok: true }
  }

  async function reenviarConfirmacion(correo: string): Promise<Resultado> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: correo.trim().toLowerCase(),
      options: { emailRedirectTo: `${origen}/confirmar` },
    })
    return error ? { ok: false, mensaje: mensajeDeError(error.code) } : { ok: true }
  }

  async function registrarse(datos: DatosRegistro): Promise<Resultado> {
    const { data, error } = await supabase.auth.signUp({
      email: datos.correo.trim().toLowerCase(),
      password: datos.clave,
      options: {
        emailRedirectTo: `${origen}/confirmar`,
        // Estos datos los usa el trigger de la base para crear el perfil.
        data: {
          nombre: datos.nombre.trim(),
          apellido: datos.apellido.trim(),
          dni: limpiarDni(datos.dni),
          fecha_nacimiento: datos.fechaNacimiento,
          telefono: limpiarTelefono(datos.telefono),
          localidad: datos.localidad.trim(),
          rol: datos.rol,
        },
      },
    })

    // Si el correo ya tiene una cuenta confirmada, Supabase no da error (para no revelar qué
    // correos existen): devuelve un usuario sin "identidades". Así lo detectamos.
    const yaExiste = error?.code === 'user_already_exists' || data.user?.identities?.length === 0
    if (yaExiste) {
      return {
        ok: false,
        mensaje: 'Ya hay una cuenta con este correo. Podés ingresar o crear una contraseña nueva.',
        ofrecerRecuperar: true,
      }
    }
    if (error) {
      return { ok: false, mensaje: mensajeDeError(error.code) }
    }
    return { ok: true }
  }

  async function salir() {
    await supabase.auth.signOut()
    usuario.value = null
    cuenta.olvidar()
  }

  // Siempre responde lo mismo: no contamos si el correo tiene cuenta o no.
  async function pedirRecuperacion(correo: string): Promise<Resultado> {
    await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase(), {
      redirectTo: `${origen}/nueva-clave`,
    })
    return { ok: true }
  }

  async function cambiarClave(nueva: string): Promise<Resultado> {
    const { error } = await supabase.auth.updateUser({ password: nueva })
    if (error) {
      return { ok: false, mensaje: mensajeDeError(error.code) }
    }
    return { ok: true }
  }

  /**
   * Para /confirmar y /nueva-clave: el enlace del correo abre la página y Supabase arma la
   * sesión solo (con `?code=`). Si el correo usa `?token_hash=`, la armamos acá.
   * Devuelve si hay sesión.
   */
  async function sesionDesdeEnlace(tokenHash: unknown, tipo: 'email' | 'recovery'): Promise<boolean> {
    if (typeof tokenHash === 'string' && tokenHash !== '') {
      await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
    }
    const { data } = await supabase.auth.getSession()
    await actualizarUsuario()
    return data.session !== null
  }

  return {
    usuario,
    conSesion,
    ingresar,
    reenviarConfirmacion,
    registrarse,
    salir,
    pedirRecuperacion,
    cambiarClave,
    sesionDesdeEnlace,
  }
}
