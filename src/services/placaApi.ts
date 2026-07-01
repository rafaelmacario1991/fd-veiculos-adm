export interface DadosVeiculoPlaca {
  marca?: string
  modelo?: string
  ano_fabricacao?: number
  ano_modelo?: number
  cor?: string
  chassi?: string
  combustivel?: string
  nr_motor?: string
  tipo_veiculo?: string
  potencia?: string
}

interface RespostaConsultarPlaca {
  status?: string
  dados?: {
    informacoes_veiculo?: {
      dados_veiculo?: Record<string, string>
      dados_tecnicos?: Record<string, string>
    }
  }
  message?: string
}

export async function consultarPlaca(placa: string): Promise<DadosVeiculoPlaca> {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
  const placaNorm   = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const resp = await fetch(
    `${supabaseUrl}/functions/v1/consultar-placa?placa=${placaNorm}`
  )

  const body = await resp.json() as RespostaConsultarPlaca

  if (!resp.ok || body.status !== 'ok') {
    throw new Error(body.message ?? `Erro ${resp.status}`)
  }

  const v = body.dados?.informacoes_veiculo?.dados_veiculo ?? {}
  const t = body.dados?.informacoes_veiculo?.dados_tecnicos ?? {}

  // modelo retorna como "MARCA/MODELO VERSAO" — extraímos só o que vem após "/"
  const modeloRaw = v['modelo'] ?? ''
  const modeloLimpo = modeloRaw.includes('/')
    ? modeloRaw.split('/').slice(1).join('/').trim()
    : modeloRaw.trim()

  return {
    marca:        v['marca']?.trim()          || undefined,
    modelo:       modeloLimpo                 || undefined,
    ano_fabricacao: v['ano_fabricacao']       ? Number(v['ano_fabricacao'])  : undefined,
    ano_modelo:   v['ano_modelo']             ? Number(v['ano_modelo'])      : undefined,
    cor:          v['cor']?.trim()            || undefined,
    chassi:       v['chassi']?.trim()         || undefined,
    combustivel:  v['combustivel']?.trim()    || undefined,
    nr_motor:     t['numero_motor']?.trim()   || undefined,
    tipo_veiculo: t['tipo_veiculo']?.trim()   || undefined,
    potencia:     t['potencia']?.trim()       || undefined,
  }
}
