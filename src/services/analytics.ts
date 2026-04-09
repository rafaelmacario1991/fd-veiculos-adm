import { supabase } from './supabase'

export interface FiltrosQuadro {
  de: string
  ate: string
  vendedorId?: string
}

export interface VendaAnalytics {
  id: string
  criado_em: string
  valor_venda: number
  forma_pagamento: string
  banco_financeira: string | null
  vendedor_id: string
  vendedor_nome: string
}

export interface ResumoQuadro {
  totalVendas: number
  valorTotal: number
  ticketMedio: number
  porFormaPagamento: { forma: string; qtd: number; valor: number }[]
  porBanco: { banco: string; qtd: number; valor: number }[]
  porVendedor: { nome: string; qtd: number; valor: number }[]
  porSemana: { semana: string; qtd: number; valor: number }[]
  porDia: { dia: string; qtd: number; valor: number }[]
}

export interface Vendedor {
  id: string
  nome: string
}

export async function listarVendedores(): Promise<Vendedor[]> {
  const { data } = await supabase
    .from('user_roles')
    .select('user_id, users!user_roles_user_id_fkey(id, nome)')
    .eq('perfil', 'vendedor')

  const vistos = new Set<string>()
  const lista: Vendedor[] = []
  for (const r of data ?? []) {
    const u = (r as unknown as { users: { id: string; nome: string } }).users
    if (u && !vistos.has(u.id)) {
      vistos.add(u.id)
      lista.push({ id: u.id, nome: u.nome })
    }
  }
  return lista.sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function buscarDadosQuadro(filtros: FiltrosQuadro): Promise<ResumoQuadro> {
  let query = supabase
    .from('sales')
    .select('id, criado_em, valor_venda, forma_pagamento, banco_financeira, vendedor_id, users!sales_vendedor_id_fkey(nome)')
    .order('criado_em')

  if (filtros.de)        query = query.gte('criado_em', filtros.de)
  if (filtros.ate)       query = query.lte('criado_em', filtros.ate + 'T23:59:59')
  if (filtros.vendedorId) query = query.eq('vendedor_id', filtros.vendedorId)

  const { data, error } = await query
  if (error) throw error

  const vendas: VendaAnalytics[] = (data ?? []).map((v) => ({
    ...(v as unknown as VendaAnalytics),
    vendedor_nome: ((v as unknown as { users: { nome: string } }).users?.nome) ?? '—',
  }))

  const totalVendas = vendas.length
  const valorTotal = vendas.reduce((s, v) => s + (v.valor_venda ?? 0), 0)
  const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0

  // Por forma de pagamento
  const pagMap = new Map<string, { qtd: number; valor: number }>()
  for (const v of vendas) {
    const f = v.forma_pagamento ?? 'outros'
    const cur = pagMap.get(f) ?? { qtd: 0, valor: 0 }
    pagMap.set(f, { qtd: cur.qtd + 1, valor: cur.valor + v.valor_venda })
  }
  const formaLabel: Record<string, string> = {
    a_vista: 'À Vista', cartao: 'Cartão', financiamento: 'Financiamento',
  }
  const porFormaPagamento = [...pagMap.entries()].map(([f, d]) => ({
    forma: formaLabel[f] ?? f, qtd: d.qtd, valor: d.valor,
  })).sort((a, b) => b.qtd - a.qtd)

  // Por banco/financeira (só financiamentos)
  const bancoMap = new Map<string, { qtd: number; valor: number }>()
  for (const v of vendas.filter((v) => v.forma_pagamento === 'financiamento')) {
    const b = v.banco_financeira?.trim() || 'Não informado'
    const cur = bancoMap.get(b) ?? { qtd: 0, valor: 0 }
    bancoMap.set(b, { qtd: cur.qtd + 1, valor: cur.valor + v.valor_venda })
  }
  const porBanco = [...bancoMap.entries()]
    .map(([banco, d]) => ({ banco, qtd: d.qtd, valor: d.valor }))
    .sort((a, b) => b.qtd - a.qtd)

  // Por vendedor
  const vendMap = new Map<string, { qtd: number; valor: number }>()
  for (const v of vendas) {
    const n = v.vendedor_nome
    const cur = vendMap.get(n) ?? { qtd: 0, valor: 0 }
    vendMap.set(n, { qtd: cur.qtd + 1, valor: cur.valor + v.valor_venda })
  }
  const porVendedor = [...vendMap.entries()]
    .map(([nome, d]) => ({ nome, qtd: d.qtd, valor: d.valor }))
    .sort((a, b) => b.qtd - a.qtd)

  // Por dia
  const diaMap = new Map<string, { qtd: number; valor: number }>()
  for (const v of vendas) {
    const dia = v.criado_em.split('T')[0]
    const cur = diaMap.get(dia) ?? { qtd: 0, valor: 0 }
    diaMap.set(dia, { qtd: cur.qtd + 1, valor: cur.valor + v.valor_venda })
  }
  const porDia = [...diaMap.entries()]
    .map(([dia, d]) => ({ dia, qtd: d.qtd, valor: d.valor }))
    .sort((a, b) => a.dia.localeCompare(b.dia))

  // Por semana (ISO week label)
  const semMap = new Map<string, { qtd: number; valor: number }>()
  for (const v of vendas) {
    const d = new Date(v.criado_em)
    const startOfWeek = new Date(d)
    const day = d.getDay()
    startOfWeek.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    const sem = startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const cur = semMap.get(sem) ?? { qtd: 0, valor: 0 }
    semMap.set(sem, { qtd: cur.qtd + 1, valor: cur.valor + v.valor_venda })
  }
  const porSemana = [...semMap.entries()]
    .map(([semana, d]) => ({ semana, qtd: d.qtd, valor: d.valor }))

  return { totalVendas, valorTotal, ticketMedio, porFormaPagamento, porBanco, porVendedor, porSemana, porDia }
}
