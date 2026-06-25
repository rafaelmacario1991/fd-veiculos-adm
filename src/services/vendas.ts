import { addHours } from 'date-fns'
import { supabase } from './supabase'
import type { StatusVenda, FormaPagamento, MetodoPagamentoItem, PendenciaVendedor, AtividadeSetor } from '@/types'

// Tipo retornado nas listagens (join com Supabase)
export interface VendaListagem {
  id: string
  vendedor_id: string
  status: StatusVenda
  // Veículo
  marca: string
  modelo: string
  versao: string | null
  ano_fabricacao: number
  ano_modelo: number
  cor: string
  placa: string
  renavam: string
  chassi: string
  quilometragem: number
  valor_venda: number
  // Comprador
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
  // Negociação
  forma_pagamento: FormaPagamento
  formas_pagamento_json: MetodoPagamentoItem[] | null
  banco_financeira: string | null
  valor_entrada: number | null
  valor_financiado: number | null
  numero_parcelas: number | null
  observacoes: string | null
  // Metadados
  criado_em: string
  atualizado_em: string
  seller_pendencies: PendenciaVendedor[]
  sector_activities: AtividadeSetor[]
}

export interface DadosNovaVenda {
  marca: string
  modelo: string
  versao?: string
  ano_fabricacao: number
  ano_modelo: number
  cor: string
  placa: string
  renavam?: string
  chassi?: string
  quilometragem: number
  valor_venda: number
  comprador_nome: string
  comprador_cpf_cnpj: string
  comprador_rg?: string
  comprador_nascimento?: string
  comprador_logradouro: string
  comprador_numero: string
  comprador_complemento?: string
  comprador_bairro: string
  comprador_cidade: string
  comprador_uf: string
  comprador_cep: string
  comprador_telefone: string
  comprador_email?: string
  forma_pagamento: FormaPagamento
  formas_pagamento_json: MetodoPagamentoItem[]
  observacoes?: string
}

export interface FiltrosVendas {
  de?: string
  ate?: string
  status?: string
}

export async function listarVendasDoVendedor(vendedorId: string, filtros: FiltrosVendas = {}): Promise<VendaListagem[]> {
  let query = supabase
    .from('sales')
    .select('*, seller_pendencies(*), sector_activities(*)')
    .eq('vendedor_id', vendedorId)
    .order('criado_em', { ascending: false })

  if (filtros.status) query = query.eq('status', filtros.status)
  if (filtros.de)     query = query.gte('criado_em', filtros.de)
  if (filtros.ate)    query = query.lte('criado_em', filtros.ate + 'T23:59:59')

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as VendaListagem[]
}

export async function criarVenda(dados: DadosNovaVenda, vendedorId: string, id?: string): Promise<string> {
  // 1. Inserir a venda
  const { data: venda, error: erroVenda } = await supabase
    .from('sales')
    .insert({
      ...(id ? { id } : {}),
      ...dados,
      vendedor_id: vendedorId,
      status: 'pendencia_vendedor',
    })
    .select('id')
    .single()

  if (erroVenda) throw erroVenda

  const saleId = venda.id
  const prazo72h = addHours(new Date(), 72).toISOString()

  // 2. Criar demandas dos 4 setores (prazo padrão: 24h)
  const prazo24h = addHours(new Date(), 24).toISOString()
  const { error: erroAtividades } = await supabase
    .from('sector_activities')
    .insert([
      { sale_id: saleId, setor: 'contratos',     prazo: prazo24h },
      { sale_id: saleId, setor: 'financeiro',    prazo: prazo24h },
      { sale_id: saleId, setor: 'fiscal',        prazo: prazo24h },
      { sale_id: saleId, setor: 'transferencia', prazo: prazo24h },
    ])

  if (erroAtividades) throw erroAtividades

  // 3. Criar 2 pendências do vendedor (prazo 72h)
  const { error: erroPendencias } = await supabase
    .from('seller_pendencies')
    .insert([
      { sale_id: saleId, vendedor_id: vendedorId, tipo: 'vistoria', prazo: prazo72h },
      { sale_id: saleId, vendedor_id: vendedorId, tipo: 'firma', prazo: prazo72h },
    ])

  if (erroPendencias) throw erroPendencias

  return saleId
}

export async function listarTodasVendas(filtros: FiltrosVendas = {}): Promise<VendaListagem[]> {
  let query = supabase
    .from('sales')
    .select('*, seller_pendencies(*), sector_activities(*)')
    .order('criado_em', { ascending: false })

  if (filtros.status) query = query.eq('status', filtros.status)
  if (filtros.de)     query = query.gte('criado_em', filtros.de)
  if (filtros.ate)    query = query.lte('criado_em', filtros.ate + 'T23:59:59')

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as VendaListagem[]
}

export async function cancelarVenda(vendaId: string): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .update({ status: 'cancelada' })
    .eq('id', vendaId)
  if (error) throw error
}

export async function excluirVenda(vendaId: string): Promise<void> {
  const { error } = await supabase.rpc('excluir_venda', { p_sale_id: vendaId })
  if (error) throw error
}

export async function marcarPendenciaConcluida(pendenciaId: string): Promise<void> {
  const { error } = await supabase
    .from('seller_pendencies')
    .update({ status: 'aguardando_aprovacao', concluido_em: new Date().toISOString() })
    .eq('id', pendenciaId)

  if (error) throw error
}
