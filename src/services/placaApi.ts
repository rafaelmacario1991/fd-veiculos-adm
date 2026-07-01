export interface DadosVeiculoPlaca {
  marca?: string
  modelo?: string
  ano_fabricacao?: number
  ano_modelo?: number
  cor?: string
  chassi?: string
}

export async function consultarPlaca(placa: string): Promise<DadosVeiculoPlaca> {
  const email  = (import.meta.env.VITE_CONSULTARPLACA_EMAIL  as string | undefined) ?? ''
  const apiKey = (import.meta.env.VITE_CONSULTARPLACA_APIKEY as string | undefined) ?? ''

  if (!email || !apiKey) throw new Error('Credenciais não configuradas.')

  const placaNorm = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const credentials = btoa(`${email}:${apiKey}`)

  const resp = await fetch(
    `https://api.consultarplaca.com.br/v2/consultarPlaca?placa=${placaNorm}`,
    { headers: { Authorization: `Basic ${credentials}` } }
  )

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `Erro ${resp.status}`)
  }

  const data = await resp.json() as Record<string, string>

  // modelo retorna como "MARCA/MODELO VERSAO" — extraímos só o que vem após "/"
  const modeloRaw = data['modelo'] ?? ''
  const modeloLimpo = modeloRaw.includes('/')
    ? modeloRaw.split('/').slice(1).join('/').trim()
    : modeloRaw.trim()

  return {
    marca:          data['marca']?.trim()   || undefined,
    modelo:         modeloLimpo             || undefined,
    ano_fabricacao: data['ano_fabricacao']  ? Number(data['ano_fabricacao'])  : undefined,
    ano_modelo:     data['ano_modelo']      ? Number(data['ano_modelo'])      : undefined,
    cor:            data['cor']?.trim()     || undefined,
    chassi:         data['chassi']?.trim()  || undefined,
  }
}
