import { interpretar } from './reglas.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Usá POST.' }, 405)

  const { texto } = await req.json().catch(() => ({ texto: undefined }))
  if (typeof texto !== 'string' || !texto.trim() || texto.length > 500) {
    return json({ error: 'Mandá un texto de hasta 500 letras.' }, 400)
  }
  return json(interpretar(texto))
})
