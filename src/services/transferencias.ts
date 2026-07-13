import { supabase } from './supabase'
import { addDays } from 'date-fns'
import type { ProcessoTransferencia, Despachante, StatusTransferencia } from '@/types'

export interface ProcessoComDespachante extends ProcessoTransferencia {
  dispatchers: Despachante
}

export async function listarDespachantes(): Promise<Despachante[]> {
  const { data, error } = await supabase
    .from('dispatchers')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return (data ?? []) as Despachante[]
}

export interface FiltrosTransferencia {
  de?: string
  ate?: string
  status?: string
  unidade?: string
}

export async function listarTransferencias(filtros: FiltrosTransferencia = {}): Promise<ProcessoComDespachante[]> {
  let query = supabase
    .from('transfer_processes')
    .select('*, dispatchers(*), sales(marca, modelo, placa, comprador_nome, valor_venda, unidade)')
    .order('criado_em', { ascending: false })

  if (filtros.status)  query = query.eq('status', filtros.status)
  if (filtros.de)      query = query.gte('criado_em', filtros.de)
  if (filtros.ate)     query = query.lte('criado_em', filtros.ate + 'T23:59:59')
  if (filtros.unidade) query = query.eq('sales.unidade', filtros.unidade)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ProcessoComDespachante[]
}

export async function criarTransferencia(
  saleId: string,
  despachanteId: string
): Promise<void> {
  const agora = new Date()
  const prazo = addDays(agora, 30).toISOString()

  const { error } = await supabase
    .from('transfer_processes')
    .insert({
      sale_id: saleId,
      despachante_id: despachanteId,
      data_envio: agora.toISOString(),
      prazo,
    })

  if (error) throw error
}

// ── Pendências de transferência (antes do envio ao despachante) ──────

export interface PendenciaTransferencia {
  id: string
  sale_id: string
  descricao: string
  status: string
  registrado_por: string
  criado_em: string
}

export async function registrarPendenciaTransferencia(
  saleId: string,
  descricao: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('pendencies')
    .insert({ sale_id: saleId, setor: 'transferencia', descricao, registrado_por: userId })
  if (error) throw error
}

export async function listarPendenciasTransferencia(saleIds: string[]): Promise<PendenciaTransferencia[]> {
  if (saleIds.length === 0) return []
  const { data, error } = await supabase
    .from('pendencies')
    .select('id, sale_id, descricao, status, registrado_por, criado_em')
    .eq('setor', 'transferencia')
    .eq('status', 'aberta')
    .in('sale_id', saleIds)
  if (error) throw error
  return (data ?? []) as PendenciaTransferencia[]
}

export async function encerrarPendenciaTransferencia(
  pendenciaId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('pendencies')
    .update({ status: 'encerrada', encerrado_por: userId, encerrado_em: new Date().toISOString() })
    .eq('id', pendenciaId)
  if (error) throw error
}

export async function atualizarStatusTransferencia(
  processoId: string,
  status: StatusTransferencia,
  descricaoPendencia?: string
): Promise<void> {
  const { error } = await supabase
    .from('transfer_processes')
    .update({
      status,
      descricao_pendencia: descricaoPendencia ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', processoId)

  if (error) throw error
}
