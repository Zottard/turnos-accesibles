// Manda por correo los avisos que ya salieron y piden correo. La llama pg_cron cada 10 minutos.
// Necesita el secreto RESEND_API_KEY (y opcional CORREO_REMITENTE). Sin eso, marca el error y la app sigue igual.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: valida } = await supabase.rpc('clave_cron_valida', { p_clave: req.headers.get('x-clave-cron') ?? '' })
  if (!valida) return json({ error: 'No autorizado.' }, 401)

  const { data: pendientes, error } = await supabase
    .from('notificaciones')
    .select('id, profile_id, canal, titulo, cuerpo')
    .in('canal', ['email', 'ambos'])
    .is('correo_enviado_en', null)
    .is('error', null)
    .neq('estado', 'programada')
    .limit(50)
  if (error) return json({ error: error.message }, 500)

  const claveResend = Deno.env.get('RESEND_API_KEY')
  const remitente = Deno.env.get('CORREO_REMITENTE') ?? 'Turnos Accesibles <onboarding@resend.dev>'
  let enviados = 0

  for (const aviso of pendientes ?? []) {
    const fallar = (motivo: string) =>
      supabase.from('notificaciones')
        .update({ error: motivo, ...(aviso.canal === 'email' ? { estado: 'fallida' } : {}) })
        .eq('id', aviso.id)

    if (!claveResend) {
      await fallar('Falta configurar RESEND_API_KEY: el correo no salió.')
      continue
    }

    const { data: usuario } = await supabase.auth.admin.getUserById(aviso.profile_id)
    const correo = usuario.user?.email
    if (!correo) {
      await fallar('La cuenta no tiene correo.')
      continue
    }

    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${claveResend}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: remitente,
        to: correo,
        subject: aviso.titulo,
        text: `${aviso.cuerpo}\n\nEste aviso lo manda Turnos Accesibles, un trabajo de la UTN FRGP. No es el sistema oficial del hospital.`,
      }),
    }).catch(() => null)

    if (!respuesta?.ok) {
      await fallar(`El servicio de correo respondió ${respuesta?.status ?? 'sin conexión'}.`)
      continue
    }
    await supabase.from('notificaciones').update({ correo_enviado_en: new Date().toISOString() }).eq('id', aviso.id)
    enviados++
  }

  return json({ revisados: pendientes?.length ?? 0, enviados })
})
