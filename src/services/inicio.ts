import { supabase } from './supabase'

// Evento unificado para o calendário — agrega sector_activities + seller_pendencies + tarefas
export interface EventoCalendario {
  id: string
  titulo: string
  prazo: string            // ISO 8601
  tipo: 'atividade_setor' | 'pendencia_vendedor' | 'tarefa'
  status: string           // 'pendente' | 'concluida' | 'aberta' | 'aguardando_aprovacao' | 'aprovada'
  setor?: string
  sale_id?: string
  venda?: string           // "Marca Modelo" para exibição
}

export async function excluirEventoPendencia(id: string, tipo: EventoCalendario['tipo']): Promise<void> {
  let error: unknown
  if (tipo === 'atividade_setor') {
    ({ error } = await supabase.from('sector_activities').delete().eq('id', id))
  } else if (tipo === 'pendencia_vendedor') {
    ({ error } = await supabase.from('seller_pendencies').delete().eq('id', id))
  } else {
    ({ error } = await supabase.from('tarefas').delete().eq('id', id))
  }
  if (error) throw error
}

export async function listarEventosCalendario(): Promise<EventoCalendario[]> {
  const [atividadesRes, pendenciasRes, tarefasRes] = await Promise.all([
    supabase
      .from('sector_activities')
      .select('id, sale_id, setor, status, prazo, sales(marca, modelo)')
      .not('prazo', 'is', null)
      .order('prazo', { ascending: true }),

    supabase
      .from('seller_pendencies')
      .select('id, sale_id, tipo, status, prazo, sales(marca, modelo)')
      .order('prazo', { ascending: true }),

    supabase
      .from('tarefas')
      .select('id, titulo, prazo, status, setor_responsavel')
      .order('prazo', { ascending: true }),
  ])

  if (atividadesRes.error) throw atividadesRes.error
  if (pendenciasRes.error) throw pendenciasRes.error
  if (tarefasRes.error) throw tarefasRes.error

  const setorLabel: Record<string, string> = {
    contratos: 'Contratos',
    financeiro: 'Financeiro',
    fiscal: 'Fiscal',
    transferencia: 'Transferência',
  }

  const tipoLabel: Record<string, string> = {
    vistoria: 'Vistoria do Veículo',
    firma: 'Reconhecimento de Firma',
  }

  const atividades: EventoCalendario[] = (atividadesRes.data ?? []).map((a: any) => ({
    id: a.id,
    titulo: `${setorLabel[a.setor] ?? a.setor} — ${a.sales ? `${a.sales.marca} ${a.sales.modelo}` : 'Venda'}`,
    prazo: a.prazo,
    tipo: 'atividade_setor',
    status: a.status,
    setor: a.setor,
    sale_id: a.sale_id,
    venda: a.sales ? `${a.sales.marca} ${a.sales.modelo}` : undefined,
  }))

  const pendencias: EventoCalendario[] = (pendenciasRes.data ?? []).map((p: any) => ({
    id: p.id,
    titulo: `${tipoLabel[p.tipo] ?? p.tipo} — ${p.sales ? `${p.sales.marca} ${p.sales.modelo}` : 'Venda'}`,
    prazo: p.prazo,
    tipo: 'pendencia_vendedor',
    status: p.status,
    sale_id: p.sale_id,
    venda: p.sales ? `${p.sales.marca} ${p.sales.modelo}` : undefined,
  }))

  const tarefas: EventoCalendario[] = (tarefasRes.data ?? []).map((t: any) => ({
    id: t.id,
    titulo: t.titulo,
    prazo: t.prazo,
    tipo: 'tarefa',
    status: t.status,
    setor: t.setor_responsavel,
  }))

  return [...atividades, ...pendencias, ...tarefas].sort(
    (a, b) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime(),
  )
}
