import { supabase } from './supabase'

export type TipoComissao = 'financiamento' | 'a_vista' | 'transferencia' | 'vale'

export interface Comissao {
  id: string
  vendedor_id: string
  tipo: TipoComissao
  descricao: string | null
  placa: string | null
  valor_financiado: number | null
  retorno: number | null
  valor_comissao: number
  criado_em: string
}

export interface ComissaoConfig {
  vendedor_id: string
  salario_base: number
  valor_faixa1: number
  meta_vendas: number
  valor_faixa2: number
  meta_vendas2: number
  valor_faixa3: number
  atualizado_em: string
}

export interface DadosNovaComissao {
  tipo: TipoComissao
  descricao?: string
  placa?: string
  valor_financiado?: number
  retorno?: number
  valor_comissao: number
}

// ── Cálculos ────────────────────────────────────────────────────

export function calcularRetornoFinanciamento(valorFinanciado: number, retorno: number): number {
  return ((valorFinanciado * retorno) * 0.75) * 0.001
}

export function calcularFaixa(config: ComissaoConfig, totalVendasAtuais: number): {
  faixa: 1 | 2 | 3
  valorBase: number
} {
  let faixa: 1 | 2 | 3
  if (totalVendasAtuais < config.meta_vendas) faixa = 1
  else if (totalVendasAtuais < config.meta_vendas2) faixa = 2
  else faixa = 3

  const valorBase =
    faixa === 1 ? config.valor_faixa1 :
    faixa === 2 ? config.valor_faixa2 :
    config.valor_faixa3

  return { faixa, valorBase }
}

// ── Comissão config ──────────────────────────────────────────────

export async function buscarConfig(vendedorId: string): Promise<ComissaoConfig | null> {
  const { data, error } = await supabase
    .from('comissao_config')
    .select('*')
    .eq('vendedor_id', vendedorId)
    .maybeSingle()

  if (error) throw error
  return data as ComissaoConfig | null
}

export async function salvarConfig(
  vendedorId: string,
  config: Pick<ComissaoConfig, 'salario_base' | 'valor_faixa1' | 'meta_vendas' | 'valor_faixa2' | 'meta_vendas2' | 'valor_faixa3'>
): Promise<void> {
  const { error } = await supabase
    .from('comissao_config')
    .upsert({ vendedor_id: vendedorId, ...config, atualizado_em: new Date().toISOString() })

  if (error) throw error
}

// Calcula o valor de uma entrada considerando o tier atual (retroativo)
export function calcularValorEntrada(
  comissao: Comissao,
  valorBase: number
): number {
  if (comissao.tipo === 'financiamento') {
    const retorno =
      comissao.valor_financiado != null && comissao.retorno != null
        ? calcularRetornoFinanciamento(comissao.valor_financiado, comissao.retorno)
        : 0
    return valorBase + retorno + comissao.valor_comissao
  }
  if (comissao.tipo === 'a_vista') return valorBase + comissao.valor_comissao
  // transferencia e vale usam o valor armazenado
  return comissao.valor_comissao
}

// ── Entradas de comissão ─────────────────────────────────────────

export async function listarComissoes(vendedorId: string): Promise<Comissao[]> {
  const { data, error } = await supabase
    .from('comissoes')
    .select('*')
    .eq('vendedor_id', vendedorId)
    .order('criado_em', { ascending: false })

  if (error) throw error
  return (data ?? []) as Comissao[]
}

export async function adicionarComissao(
  vendedorId: string,
  dados: DadosNovaComissao
): Promise<void> {
  const { error } = await supabase
    .from('comissoes')
    .insert({ vendedor_id: vendedorId, ...dados })

  if (error) throw error
}

export async function excluirComissao(id: string): Promise<void> {
  const { error } = await supabase.from('comissoes').delete().eq('id', id)
  if (error) throw error
}
