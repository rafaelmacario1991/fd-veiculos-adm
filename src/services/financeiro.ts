import { supabase } from './supabase'
import type { PendenciaFinanceira } from '@/types'

export async function atualizarConfirmacoesFinanceiro(
  atividadeId: string,
  confirmacoes: Record<string, boolean>
): Promise<void> {
  const { error } = await supabase
    .from('sector_activities')
    .update({ dados_json: { confirmacoes } })
    .eq('id', atividadeId)
  if (error) throw error
}

export async function listarPendenciasFinanceiras(saleId: string): Promise<PendenciaFinanceira[]> {
  const { data, error } = await supabase
    .from('pendencies')
    .select('*')
    .eq('sale_id', saleId)
    .order('criado_em', { ascending: false })

  if (error) throw error
  return (data ?? []) as PendenciaFinanceira[]
}

export async function registrarPendenciaFinanceira(
  saleId: string,
  descricao: string,
  registradoPor: string
): Promise<void> {
  const { error } = await supabase
    .from('pendencies')
    .insert({
      sale_id: saleId,
      setor: 'financeiro',
      descricao,
      registrado_por: registradoPor,
    })

  if (error) throw error
}

export async function encerrarPendenciaFinanceira(
  pendenciaId: string,
  encerradoPor: string
): Promise<void> {
  const { error } = await supabase
    .from('pendencies')
    .update({
      status: 'encerrada',
      encerrado_por: encerradoPor,
      encerrado_em: new Date().toISOString(),
    })
    .eq('id', pendenciaId)

  if (error) throw error
}
