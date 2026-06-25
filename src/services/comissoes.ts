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

export interface DadosNovaComissao {
  tipo: TipoComissao
  descricao?: string
  placa?: string
  valor_financiado?: number
  retorno?: number
  valor_comissao: number
}

export function calcularComissaoFinanciamento(valorFinanciado: number, retorno: number): number {
  return ((valorFinanciado * retorno) * 0.75) * 0.001
}

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
