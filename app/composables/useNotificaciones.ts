export function useNotificaciones() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const noLeidas = useState('avisos-no-leidos', () => 0)

  async function contar() {
    if (!user.value) {
      noLeidas.value = 0
      return 0
    }
    const { count } = await supabase.from('notificaciones').select('id', { count: 'exact', head: true }).is('leida_en', null)
    noLeidas.value = count ?? 0
    return noLeidas.value
  }

  async function listar() {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('id, tipo, titulo, cuerpo, enviada_en, leida_en, reserva_id, canal, correo_enviado_en')
      .order('enviada_en', { ascending: false })
      .limit(50)
    if (error) throw error
    return data ?? []
  }

  async function marcarLeidas(id?: string) {
    await supabase.rpc('marcar_leidas', { p_id: id })
    await contar()
  }

  return { noLeidas, contar, listar, marcarLeidas }
}

export type Notificacion = Awaited<ReturnType<ReturnType<typeof useNotificaciones>['listar']>>[number]
