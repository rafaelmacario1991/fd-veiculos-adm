import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const placa = new URL(req.url).searchParams.get('placa')
    if (!placa) {
      return new Response(JSON.stringify({ error: 'Placa não informada' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const email  = Deno.env.get('CONSULTARPLACA_EMAIL')  ?? ''
    const apiKey = Deno.env.get('CONSULTARPLACA_APIKEY') ?? ''
    const credentials = btoa(`${email}:${apiKey}`)

    const resp = await fetch(
      `https://api.consultarplaca.com.br/v2/consultarPlaca?placa=${placa}`,
      { headers: { Authorization: `Basic ${credentials}` } }
    )

    const data = await resp.json()

    return new Response(JSON.stringify(data), {
      status: resp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
