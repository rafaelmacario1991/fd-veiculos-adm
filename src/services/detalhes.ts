import { supabase } from './supabase'

export interface DetalheVenda {
  // Venda
  id: string
  status: string
  marca: string
  modelo: string
  versao: string | null
  ano_fabricacao: number
  ano_modelo: number
  cor: string
  placa: string
  renavam: string | null
  chassi: string | null
  nr_motor: string | null
  combustivel: string | null
  potencia: string | null
  tipo_veiculo: string | null
  quilometragem: number
  valor_venda: number
  comprador_nome: string
  comprador_cpf_cnpj: string
  comprador_rg: string | null
  comprador_nascimento: string | null
  comprador_logradouro: string
  comprador_numero: string
  comprador_complemento: string | null
  comprador_bairro: string
  comprador_cidade: string
  comprador_uf: string
  comprador_cep: string
  comprador_telefone: string
  comprador_email: string | null
  comprador_profissao: string | null
  canal_venda: string | null
  forma_pagamento: string
  formas_pagamento_json: Record<string, unknown>[] | null
  banco_financeira: string | null
  valor_entrada: number | null
  valor_financiado: number | null
  numero_parcelas: number | null
  transferencia_info: string | null
  ipva_info: string | null
  troco: number | null
  observacoes: string | null
  data_venda: string | null
  data_prevista_entrega: string | null
  criado_em: string
  atualizado_em: string
  // Relações
  vendedor: { nome: string; whatsapp: string | null } | null
  atividades: AtividadeDetalhe[]
  pendencias_vendedor: PendenciaVendedorDetalhe[]
  pendencias_financeiras: PendenciaFinanceiraDetalhe[]
  transferencia: TransferenciaDetalhe | null
  veiculos_entrada: VeiculoEntradaDetalhe[]
}

export interface AtividadeDetalhe {
  id: string
  setor: string
  status: string
  dados_json: Record<string, unknown> | null
  concluido_em: string | null
  criado_em: string
  responsavel: { nome: string } | null
}

export interface PendenciaVendedorDetalhe {
  id: string
  tipo: string
  status: string
  prazo: string
  concluido_em: string | null
  aprovado_em: string | null
  aprovador: { nome: string } | null
  criado_em: string
}

export interface PendenciaFinanceiraDetalhe {
  id: string
  descricao: string
  status: string
  criado_em: string
  encerrado_em: string | null
}

export interface TransferenciaDetalhe {
  id: string
  status: string
  data_envio: string
  prazo: string
  descricao_pendencia: string | null
  atualizado_em: string
  despachante: { nome: string; empresa: string | null; telefone: string } | null
}

export interface VeiculoEntradaDetalhe {
  marca: string
  modelo: string
  versao: string | null
  ano_fabricacao: number
  ano_modelo: number
  cor: string
  placa: string
  renavam: string | null
  chassi: string | null
  quilometragem: number | null
  valor_estimado: number | null
  proprietario_nome: string | null
  proprietario_cpf: string | null
  debitos_json: Array<{ descricao: string; valor: number }> | null
}

export async function buscarDetalheVenda(saleId: string): Promise<DetalheVenda | null> {
  const [
    { data: venda },
    { data: atividades },
    { data: pendenciasVendedor },
    { data: pendenciasFinanceiras },
    { data: transferencia },
    { data: entrada },
  ] = await Promise.all([
    supabase
      .from('sales')
      .select('*, users!sales_vendedor_id_fkey(nome, whatsapp)')
      .eq('id', saleId)
      .single(),

    supabase
      .from('sector_activities')
      .select('*, users!sector_activities_concluido_por_fkey(nome)')
      .eq('sale_id', saleId)
      .order('criado_em'),

    supabase
      .from('seller_pendencies')
      .select('*, users!seller_pendencies_aprovado_por_fkey(nome)')
      .eq('sale_id', saleId)
      .order('criado_em'),

    supabase
      .from('pendencies')
      .select('*')
      .eq('sale_id', saleId)
      .order('criado_em'),

    supabase
      .from('transfer_processes')
      .select('*, dispatchers(nome, empresa, telefone)')
      .eq('sale_id', saleId)
      .maybeSingle(),

    supabase
      .from('trade_in_vehicles')
      .select('*')
      .eq('sale_id', saleId)
      .order('posicao'),
  ])

  if (!venda) return null

  const v = venda as unknown as Record<string, unknown>

  return {
    ...(v as unknown as DetalheVenda),
    vendedor: (v['users'] as { nome: string; whatsapp: string | null } | null) ?? null,
    atividades: ((atividades ?? []) as unknown as Record<string, unknown>[]).map((a) => ({
      ...(a as unknown as AtividadeDetalhe),
      responsavel: (a['users'] as { nome: string } | null) ?? null,
    })),
    pendencias_vendedor: ((pendenciasVendedor ?? []) as unknown as Record<string, unknown>[]).map((p) => ({
      ...(p as unknown as PendenciaVendedorDetalhe),
      aprovador: (p['users'] as { nome: string } | null) ?? null,
    })),
    pendencias_financeiras: (pendenciasFinanceiras ?? []) as PendenciaFinanceiraDetalhe[],
    transferencia: transferencia
      ? {
          ...(transferencia as unknown as TransferenciaDetalhe),
          despachante: ((transferencia as unknown as Record<string, unknown>)['dispatchers'] as TransferenciaDetalhe['despachante']) ?? null,
        }
      : null,
    veiculos_entrada: (entrada ?? []) as VeiculoEntradaDetalhe[],
  }
}
