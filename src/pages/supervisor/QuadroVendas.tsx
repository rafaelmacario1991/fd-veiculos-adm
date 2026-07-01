import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRequererPerfil } from '@/hooks/useAuth'
import {
  buscarDadosQuadro,
  listarVendedores,
  type ResumoQuadro,
  type Vendedor,
} from '@/services/analytics'
import {
  listarTodasVendas,
  cancelarVenda,
  excluirVenda,
  type VendaListagem,
} from '@/services/vendas'
import Header from '@/components/layout/Header'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, ShoppingBag, DollarSign, BarChart2, Users,
  List, Trash2, Ban, AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const CORES_PIZZA = ['#1E40AF', '#DC2626', '#059669', '#D97706', '#7C3AED', '#0891B2']

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function hoje() { return new Date().toISOString().split('T')[0] }
function inicioMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}

const RESUMO_ZERO: ResumoQuadro = {
  totalVendas: 0, valorTotal: 0, ticketMedio: 0,
  porFormaPagamento: [], porBanco: [], porVendedor: [], porSemana: [], porDia: [],
}

const STATUS_LABEL: Record<string, string> = {
  iniciada:          'Iniciada',
  pendencia_vendedor: 'Pend. Vendedor',
  concluida:         'Concluída',
  cancelada:         'Cancelada',
}
const STATUS_COR: Record<string, string> = {
  iniciada:          'bg-blue-100 text-blue-700',
  pendencia_vendedor: 'bg-amber-100 text-amber-700',
  concluida:         'bg-green-100 text-green-700',
  cancelada:         'bg-gray-100 text-gray-500 line-through',
}

type Aba = 'analise' | 'lista'
type AcaoConfirm = { tipo: 'cancelar' | 'excluir'; venda: VendaListagem } | null
type ColunaOrdem = 'veiculo' | 'comprador' | 'vendedor' | 'valor' | 'status' | 'data'
type Direcao = 'asc' | 'desc'

export default function QuadroVendas() {
  useRequererPerfil(['supervisor'])

  const [aba, setAba] = useState<Aba>('analise')

  // Filtros compartilhados
  const [de, setDe] = useState(inicioMes)
  const [ate, setAte] = useState(hoje)
  const [vendedorId, setVendedorId] = useState('')
  const [vendedores, setVendedores] = useState<Vendedor[]>([])

  // Aba análise
  const [dados, setDados] = useState<ResumoQuadro>(RESUMO_ZERO)
  const [carregandoAnalise, setCarregandoAnalise] = useState(true)

  // Aba lista
  const [vendas, setVendas]           = useState<VendaListagem[]>([])
  const [carregandoLista, setCarregandoLista] = useState(false)
  const [acaoConfirm, setAcaoConfirm] = useState<AcaoConfirm>(null)
  const [executando, setExecutando]   = useState(false)
  const [erroAcao, setErroAcao]       = useState<string | null>(null)
  const [ordemColuna, setOrdemColuna] = useState<ColunaOrdem>('data')
  const [ordemDir, setOrdemDir]       = useState<Direcao>('desc')

  useEffect(() => {
    listarVendedores().then(setVendedores)
  }, [])

  useEffect(() => {
    if (aba !== 'analise') return
    setCarregandoAnalise(true)
    buscarDadosQuadro({ de, ate, vendedorId: vendedorId || undefined })
      .then(setDados)
      .catch(console.error)
      .finally(() => setCarregandoAnalise(false))
  }, [de, ate, vendedorId, aba])

  useEffect(() => {
    if (aba !== 'lista') return
    setCarregandoLista(true)
    listarTodasVendas({ de, ate })
      .then(setVendas)
      .catch(console.error)
      .finally(() => setCarregandoLista(false))
  }, [de, ate, aba])

  const diasLegenda = dados.porDia.map((d) => ({
    ...d,
    diaLabel: d.dia.slice(5).replace('-', '/'),
  }))

  function toggleOrdem(col: ColunaOrdem) {
    if (ordemColuna === col) {
      setOrdemDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdemColuna(col)
      setOrdemDir('asc')
    }
  }

  const vendasOrdenadas = useMemo(() => {
    const cmp = (a: VendaListagem, b: VendaListagem): number => {
      let va: string | number = ''
      let vb: string | number = ''
      switch (ordemColuna) {
        case 'veiculo':   va = `${a.marca} ${a.modelo}`; vb = `${b.marca} ${b.modelo}`; break
        case 'comprador': va = a.comprador_nome;          vb = b.comprador_nome;          break
        case 'vendedor':  va = a.users?.nome ?? '';       vb = b.users?.nome ?? '';       break
        case 'valor':     va = a.valor_venda;             vb = b.valor_venda;             break
        case 'status':    va = a.status;                  vb = b.status;                  break
        case 'data':      va = a.data_venda ?? a.criado_em; vb = b.data_venda ?? b.criado_em; break
      }
      if (va < vb) return ordemDir === 'asc' ? -1 : 1
      if (va > vb) return ordemDir === 'asc' ? 1 : -1
      return 0
    }
    return [...vendas].sort(cmp)
  }, [vendas, ordemColuna, ordemDir])

  async function confirmarAcao() {
    if (!acaoConfirm) return
    setExecutando(true)
    setErroAcao(null)
    try {
      if (acaoConfirm.tipo === 'cancelar') {
        await cancelarVenda(acaoConfirm.venda.id)
      } else {
        await excluirVenda(acaoConfirm.venda.id)
      }
      setAcaoConfirm(null)
      const novas = await listarTodasVendas({ de, ate })
      setVendas(novas)
    } catch {
      setErroAcao(`Erro ao ${acaoConfirm.tipo === 'cancelar' ? 'cancelar' : 'excluir'} a venda.`)
    } finally {
      setExecutando(false)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header titulo="Quadro de Vendas" subtitulo="Análise e indicadores comerciais" />

      <div className="flex-1 p-4 md:p-6 space-y-6">

        {/* Abas */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {([
            { id: 'analise', label: 'Análise', icon: <BarChart2 size={14} /> },
            { id: 'lista',   label: 'Lista de Vendas', icon: <List size={14} /> },
          ] as { id: Aba; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                aba === id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 space-y-2 md:space-y-0 md:flex md:flex-wrap md:items-center md:gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-xs text-gray-400">→</span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {[
              { label: 'Hoje', fn: () => { const h = hoje(); setDe(h); setAte(h) } },
              { label: '7d', fn: () => { const h = new Date(); const s = new Date(h); s.setDate(s.getDate() - 6); setDe(s.toISOString().split('T')[0]); setAte(h.toISOString().split('T')[0]) } },
              { label: 'Mês', fn: () => { setDe(inicioMes()); setAte(hoje()) } },
              { label: '30d', fn: () => { const h = new Date(); const s = new Date(h); s.setDate(s.getDate() - 29); setDe(s.toISOString().split('T')[0]); setAte(h.toISOString().split('T')[0]) } },
              { label: 'Tudo', fn: () => { setDe('2024-01-01'); setAte(hoje()) } },
            ].map(({ label, fn }) => (
              <button key={label} onClick={fn}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors">
                {label}
              </button>
            ))}
          </div>

          {aba === 'analise' && (
            <div className="flex items-center gap-2 md:ml-auto">
              <Users size={14} className="text-gray-400 flex-shrink-0" />
              <select
                value={vendedorId}
                onChange={(e) => setVendedorId(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
              >
                <option value="">Todos os vendedores</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── ABA: ANÁLISE ── */}
        {aba === 'analise' && (
          <>
            {carregandoAnalise && <p className="text-gray-400 text-sm">Carregando...</p>}
            {!carregandoAnalise && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <CardKpi icone={<ShoppingBag size={18} className="text-blue-600" />} titulo="Total de Vendas" valor={dados.totalVendas.toString()} bgIcone="bg-blue-50" />
                  <CardKpi icone={<DollarSign size={18} className="text-green-600" />} titulo="Faturamento Total" valor={formatarMoeda(dados.valorTotal)} bgIcone="bg-green-50" />
                  <CardKpi icone={<TrendingUp size={18} className="text-purple-600" />} titulo="Ticket Médio" valor={formatarMoeda(dados.ticketMedio)} bgIcone="bg-purple-50" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <BarChart2 size={15} className="text-blue-600" />
                      Vendas por Dia
                    </p>
                    {diasLegenda.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados no período</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={diasLegenda} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <XAxis dataKey="diaLabel" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip formatter={(value) => [value, 'Vendas']} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="qtd" fill="#1E40AF" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <DollarSign size={15} className="text-green-600" />
                      Bancos / Financeiras
                    </p>
                    {dados.porBanco.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados no período</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={dados.porBanco} dataKey="qtd" nameKey="banco" cx="50%" cy="50%" outerRadius={70}
                            label={({ banco, percent }: any) => `${String(banco).length > 8 ? String(banco).slice(0, 8) + '…' : banco} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                            {dados.porBanco.map((_, i) => (
                              <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, name) => [v, name]} contentStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    {dados.porBanco.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-3 justify-center">
                        {dados.porBanco.map((b, i) => (
                          <div key={b.banco} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CORES_PIZZA[i % CORES_PIZZA.length] }} />
                            <span className="text-xs text-gray-600">{b.banco} <span className="font-semibold">{b.qtd}</span></span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {dados.porSemana.length > 1 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <TrendingUp size={15} className="text-purple-600" />
                      Comparativo Semanal
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dados.porSemana} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          formatter={(value: any, name: any) =>
                            name === 'qtd' ? [value, 'Vendas'] : [formatarMoeda(value), 'Faturamento']
                          }
                          labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="qtd" fill="#1E40AF" radius={[3, 3, 0, 0]} name="qtd" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {dados.porVendedor.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Users size={15} className="text-blue-600" />
                        Ranking de Vendedores
                      </p>
                      <div className="space-y-2">
                        {dados.porVendedor.map((v, i) => (
                          <div key={v.nome} className="flex items-center gap-3">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-orange-800' : 'bg-gray-100 text-gray-500'
                            }`}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-gray-800 truncate">{v.nome}</p>
                                <span className="text-sm font-bold text-gray-900 flex-shrink-0">{v.qtd}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(v.qtd / dados.porVendedor[0].qtd) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">{formatarMoeda(v.valor)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dados.porBanco.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <BarChart2 size={15} className="text-green-600" />
                        Ranking de Bancos / Financeiras
                      </p>
                      <div className="space-y-2">
                        {dados.porBanco.map((b, i) => (
                          <div key={b.banco} className="flex items-center gap-3">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-orange-800' : 'bg-gray-100 text-gray-500'
                            }`}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-gray-800 truncate">{b.banco}</p>
                                <span className="text-sm font-bold text-gray-900 flex-shrink-0">{b.qtd}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${(b.qtd / dados.porBanco[0].qtd) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">{formatarMoeda(b.valor)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {dados.porFormaPagamento.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Detalhamento por Canal de Venda</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Canal</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qtd</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Participação</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor Total</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket Médio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dados.porFormaPagamento.map((f) => (
                            <tr key={f.forma} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium text-gray-800">{f.forma}</td>
                              <td className="py-2 px-3 text-right text-gray-700">{f.qtd}</td>
                              <td className="py-2 px-3 text-right text-gray-500">
                                {dados.totalVendas > 0 ? `${((f.qtd / dados.totalVendas) * 100).toFixed(1)}%` : '—'}
                              </td>
                              <td className="py-2 px-3 text-right text-gray-700">{formatarMoeda(f.valor)}</td>
                              <td className="py-2 px-3 text-right text-gray-500">
                                {f.qtd > 0 ? formatarMoeda(f.valor / f.qtd) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {dados.totalVendas === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <BarChart2 size={36} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Nenhuma venda no período</p>
                    <p className="text-gray-400 text-sm mt-1">Ajuste os filtros para ver os dados</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── ABA: LISTA DE VENDAS ── */}
        {aba === 'lista' && (
          <>
            {carregandoLista && <p className="text-gray-400 text-sm">Carregando...</p>}
            {!carregandoLista && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {vendas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <ShoppingBag size={36} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Nenhuma venda no período</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          {([
                            { col: 'veiculo',   label: 'Veículo',   align: 'left'   },
                            { col: 'comprador', label: 'Comprador', align: 'left'   },
                            { col: 'vendedor',  label: 'Vendedor',  align: 'left'   },
                            { col: 'valor',     label: 'Valor',     align: 'right'  },
                            { col: 'status',    label: 'Status',    align: 'center' },
                            { col: 'data',      label: 'Data',      align: 'left'   },
                          ] as { col: ColunaOrdem; label: string; align: string }[]).map(({ col, label, align }) => (
                            <th
                              key={col}
                              onClick={() => toggleOrdem(col)}
                              className={`py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition-colors text-${align}`}
                            >
                              <span className="inline-flex items-center gap-1">
                                {label}
                                {ordemColuna === col
                                  ? ordemDir === 'asc'
                                    ? <ChevronUp size={12} className="text-blue-600" />
                                    : <ChevronDown size={12} className="text-blue-600" />
                                  : <ChevronsUpDown size={12} className="text-gray-300" />
                                }
                              </span>
                            </th>
                          ))}
                          <th className="py-2.5 px-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {vendasOrdenadas.map((v) => (
                          <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${v.status === 'cancelada' ? 'opacity-60' : ''}`}>
                            <td className="py-3 px-4">
                              <p className="font-medium text-gray-900">{v.marca} {v.modelo}</p>
                              <p className="text-xs text-gray-400">{v.placa} · {v.ano_modelo}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-gray-800 truncate max-w-[160px]">{v.comprador_nome}</p>
                              <p className="text-xs text-gray-400">{v.comprador_cpf_cnpj}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-gray-800">{v.users?.nome ?? '—'}</p>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-semibold text-gray-900">{formatarMoeda(v.valor_venda)}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COR[v.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {STATUS_LABEL[v.status] ?? v.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                              {format(parseISO(v.data_venda ?? v.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1">
                                {v.status !== 'cancelada' && (
                                  <button
                                    onClick={() => setAcaoConfirm({ tipo: 'cancelar', venda: v })}
                                    title="Cancelar venda"
                                    className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                                  >
                                    <Ban size={15} />
                                  </button>
                                )}
                                <button
                                  onClick={() => setAcaoConfirm({ tipo: 'excluir', venda: v })}
                                  title="Excluir venda"
                                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Dialog de confirmação ── */}
      <Dialog open={!!acaoConfirm} onOpenChange={(v) => { if (!v) { setAcaoConfirm(null); setErroAcao(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className={acaoConfirm?.tipo === 'excluir' ? 'text-red-500' : 'text-amber-500'} />
              {acaoConfirm?.tipo === 'excluir' ? 'Excluir venda' : 'Cancelar venda'}
            </DialogTitle>
          </DialogHeader>
          {acaoConfirm && (
            <div className="space-y-4 pt-1">
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <p className="font-medium text-gray-800">{acaoConfirm.venda.marca} {acaoConfirm.venda.modelo} — {acaoConfirm.venda.placa}</p>
                <p className="text-gray-500 text-xs mt-0.5">{acaoConfirm.venda.comprador_nome} · {formatarMoeda(acaoConfirm.venda.valor_venda)}</p>
              </div>

              {acaoConfirm.tipo === 'excluir' ? (
                <p className="text-sm text-gray-600">
                  A venda e <strong>todos os dados vinculados</strong> (atividades, pendências, transferência) serão removidos permanentemente.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  A venda será marcada como <strong>Cancelada</strong>. O histórico será mantido.
                </p>
              )}

              {erroAcao && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{erroAcao}</p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={confirmarAcao}
                  disabled={executando}
                  variant={acaoConfirm.tipo === 'excluir' ? 'destructive' : 'default'}
                  className={acaoConfirm.tipo === 'cancelar' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  {executando
                    ? 'Aguarde...'
                    : acaoConfirm.tipo === 'excluir'
                      ? 'Excluir permanentemente'
                      : 'Confirmar cancelamento'
                  }
                </Button>
                <Button variant="outline" onClick={() => { setAcaoConfirm(null); setErroAcao(null) }}>
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CardKpi({
  icone, titulo, valor, bgIcone,
}: {
  icone: React.ReactNode
  titulo: string
  valor: string
  bgIcone: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg ${bgIcone} flex items-center justify-center mb-3`}>
        {icone}
      </div>
      <p className="text-xl font-bold text-gray-900">{valor}</p>
      <p className="text-xs text-gray-500 mt-0.5">{titulo}</p>
    </div>
  )
}
