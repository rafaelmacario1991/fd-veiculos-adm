import { supabase } from './supabase'
import type { PendenciaVendedor } from '@/types'

export interface PendenciaComVenda extends PendenciaVendedor {
  sales: { marca: string; modelo: string; placa: string }
  users: { nome: string }
}

export interface ResumoSetor {
  pendentes: number
  concluidas: number
}

export interface ResumoSupervisor {
  totalVendas: number
  vendasHoje: number
  pendenciasVendedor: number
  pendenciasVencidas: number
  aguardandoAprovacao: number
  pendenciasTransferencia: number
  setores: {
    contratos: ResumoSetor
    financeiro: ResumoSetor
    fiscal: ResumoSetor
    transferencia: ResumoSetor
  }
}

export interface VendaCompleta {
  id: string
  status: string
  marca: string
  modelo: string
  ano_modelo: number
  placa: string
  comprador_nome: string
  valor_venda: number
  criado_em: string
  users: { nome: string } | null
  sector_activities: { setor: string; status: string }[]
  seller_pendencies: { tipo: string; status: string; prazo: string }[]
}

export interface PendenciaDetalhe {
  id: string
  tipo: string
  status: string
  prazo: string
  concluido_em: string | null
  criado_em: string
  sales: { marca: string; modelo: string; placa: string; comprador_nome: string }
  users: { nome: string }
}

export interface AtividadeDetalhe {
  id: string
  setor: string
  status: string
  concluido_em: string | null
  criado_em: string
  sales: {
    marca: string; modelo: string; placa: string
    comprador_nome: string; valor_venda: number; criado_em: string
    users: { nome: string } | null
  }
}

// ---------------------------------------------------------------
// Helpers de período
// ---------------------------------------------------------------

export function periodoAtual() {
  const hoje = new Date()
  const de = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  return {
    de: de.toISOString().split('T')[0],
    ate: hoje.toISOString().split('T')[0],
  }
}

// ---------------------------------------------------------------
// Resumo do painel — filtrado por período
// ---------------------------------------------------------------

export async function buscarResumo(de: string, ate: string): Promise<ResumoSupervisor> {
  const ateISO = ate + 'T23:59:59'

  const [
    { count: totalVendas },
    { data: pendencias },
    { data: atividades },
    { count: pendenciasTransferencia },
  ] = await Promise.all([
    supabase.from('sales')
      .select('*', { count: 'exact', head: true })
      .gte('criado_em', de)
      .lte('criado_em', ateISO),
    supabase.from('seller_pendencies')
      .select('status, prazo')
      .in('status', ['aberta', 'aguardando_aprovacao']),
    supabase.from('sector_activities')
      .select('setor, status'),
    supabase.from('pendencies')
      .select('*', { count: 'exact', head: true })
      .eq('setor', 'transferencia')
      .eq('status', 'aberta'),
  ])

  const agora = new Date()
  const abertas = pendencias ?? []
  const ativList = atividades ?? []

  const contarSetor = (setor: string): ResumoSetor => ({
    pendentes: ativList.filter((a) => a.setor === setor && a.status === 'pendente').length,
    concluidas: ativList.filter((a) => a.setor === setor && a.status === 'concluida').length,
  })

  return {
    totalVendas: totalVendas ?? 0,
    vendasHoje: 0,
    pendenciasVendedor: abertas.filter((p) => p.status === 'aberta').length,
    pendenciasVencidas: abertas.filter((p) => p.status === 'aberta' && new Date(p.prazo) < agora).length,
    aguardandoAprovacao: abertas.filter((p) => p.status === 'aguardando_aprovacao').length,
    pendenciasTransferencia: pendenciasTransferencia ?? 0,
    setores: {
      contratos: contarSetor('contratos'),
      financeiro: contarSetor('financeiro'),
      fiscal: contarSetor('fiscal'),
      transferencia: contarSetor('transferencia'),
    },
  }
}

// ---------------------------------------------------------------
// Aprovações
// ---------------------------------------------------------------

export async function listarPendenciasAprovacao(): Promise<PendenciaComVenda[]> {
  const { data, error } = await supabase
    .from('seller_pendencies')
    .select('*, sales(marca, modelo, placa), users!seller_pendencies_vendedor_id_fkey(nome)')
    .eq('status', 'aguardando_aprovacao')
    .order('concluido_em', { ascending: true })

  if (error) throw error
  return (data ?? []) as PendenciaComVenda[]
}

export async function aprovarPendencia(pendenciaId: string): Promise<void> {
  const { error } = await supabase.rpc('aprovar_pendencia_vendedor', { p_pendencia_id: pendenciaId })
  if (error) throw error
}

export async function rejeitarPendencia(pendenciaId: string): Promise<void> {
  const { error } = await supabase
    .from('seller_pendencies')
    .update({ status: 'aberta', concluido_em: null })
    .eq('id', pendenciaId)
  if (error) throw error
}

// ---------------------------------------------------------------
// Vendas — filtradas por período
// ---------------------------------------------------------------

export async function listarTodasVendas(de?: string, ate?: string): Promise<VendaCompleta[]> {
  let query = supabase
    .from('sales')
    .select(`
      id, status, marca, modelo, ano_modelo, placa,
      comprador_nome, valor_venda, criado_em,
      users(nome),
      sector_activities(setor, status),
      seller_pendencies(tipo, status, prazo)
    `)
    .order('criado_em', { ascending: false })
    .limit(200)

  if (de) query = query.gte('criado_em', de)
  if (ate) query = query.lte('criado_em', ate + 'T23:59:59')

  const { data, error } = await query
  if (error) { console.error('[listarTodasVendas]', error); throw error }
  return (data ?? []) as unknown as VendaCompleta[]
}

// ---------------------------------------------------------------
// Pendências do vendedor — filtradas por período e status
// ---------------------------------------------------------------

export async function listarPendenciasVendedor(
  de: string,
  ate: string,
  status?: 'aberta' | 'aguardando_aprovacao' | 'aprovada'
): Promise<PendenciaDetalhe[]> {
  // FK explícito pois seller_pendencies tem dois FKs para users (vendedor_id e aprovado_por)
  let query = supabase
    .from('seller_pendencies')
    .select('id, tipo, status, prazo, concluido_em, criado_em, sales(marca, modelo, placa, comprador_nome), users!seller_pendencies_vendedor_id_fkey(nome)')
    .gte('criado_em', de)
    .lte('criado_em', ate + 'T23:59:59')
    .order('prazo', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as PendenciaDetalhe[]
}

export async function listarPendenciasVencidas(): Promise<PendenciaDetalhe[]> {
  const { data, error } = await supabase
    .from('seller_pendencies')
    .select('id, tipo, status, prazo, concluido_em, criado_em, sales(marca, modelo, placa, comprador_nome), users!seller_pendencies_vendedor_id_fkey(nome)')
    .eq('status', 'aberta')
    .lt('prazo', new Date().toISOString())
    .order('prazo', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as PendenciaDetalhe[]
}

// ---------------------------------------------------------------
// Atividades por setor — filtradas por período
// ---------------------------------------------------------------

export async function listarAtividadesSetor(
  setor: string,
  de: string,
  ate: string
): Promise<AtividadeDetalhe[]> {
  const { data, error } = await supabase
    .from('sector_activities')
    .select(`
      id, setor, status, concluido_em, criado_em,
      sales(marca, modelo, placa, comprador_nome, valor_venda, criado_em, users(nome))
    `)
    .eq('setor', setor)
    .gte('criado_em', de)
    .lte('criado_em', ate + 'T23:59:59')
    .order('criado_em', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as AtividadeDetalhe[]
}

// ── Exclusões (apenas supervisor) ──────────────────────────────────

export async function excluirVenda(saleId: string): Promise<void> {
  // notifications_log não tem CASCADE — remove antes
  await supabase.from('notifications_log').delete().eq('sale_id', saleId)
  const { error } = await supabase.from('sales').delete().eq('id', saleId)
  if (error) throw error
}

export async function excluirAtividadeSetor(atividadeId: string): Promise<void> {
  const { error } = await supabase.from('sector_activities').delete().eq('id', atividadeId)
  if (error) throw error
}

export async function excluirPendenciaVendedor(pendenciaId: string): Promise<void> {
  const { error } = await supabase.from('seller_pendencies').delete().eq('id', pendenciaId)
  if (error) throw error
}

export async function excluirTransferencia(processoId: string): Promise<void> {
  const { error } = await supabase.from('transfer_processes').delete().eq('id', processoId)
  if (error) throw error
}
