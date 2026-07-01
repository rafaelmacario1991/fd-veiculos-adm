import { supabase } from './supabase'
import type { SetorAtividade, StatusAtividade } from '@/types'
import type { VendaListagem } from './vendas'

export interface AtividadeComVenda {
  id: string
  sale_id: string
  setor: SetorAtividade
  status: StatusAtividade
  dados_json: Record<string, unknown> | null
  concluido_em: string | null
  concluido_por: string | null
  criado_em: string
  sales: VendaListagem
}

export interface FiltrosSetor {
  de?: string
  ate?: string
  status?: string
}

export async function listarAtividadesDoSetor(
  setor: SetorAtividade,
  filtros: FiltrosSetor = {}
): Promise<AtividadeComVenda[]> {
  let query = supabase
    .from('sector_activities')
    .select('*, sales(*, users!sales_vendedor_id_fkey(nome))')
    .eq('setor', setor)
    .order('criado_em', { ascending: false })

  if (filtros.status) query = query.eq('status', filtros.status)
  if (filtros.de)     query = query.gte('criado_em', filtros.de)
  if (filtros.ate)    query = query.lte('criado_em', filtros.ate + 'T23:59:59')

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as AtividadeComVenda[]
}

export async function concluirAtividade(
  atividadeId: string,
  dadosJson?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('sector_activities')
    .update({
      status: 'concluida',
      concluido_em: new Date().toISOString(),
      dados_json: dadosJson ?? null,
    })
    .eq('id', atividadeId)

  if (error) throw error
}

export async function concluirAtividadePorVenda(saleId: string, setor: SetorAtividade): Promise<void> {
  const { data } = await supabase
    .from('sector_activities')
    .select('id')
    .eq('sale_id', saleId)
    .eq('setor', setor)
    .single()

  if (data?.id) {
    await concluirAtividade(data.id)
  }
}

export async function concluirVenda(vendaId: string): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .update({ status: 'concluida' })
    .eq('id', vendaId)

  if (error) throw error
}
