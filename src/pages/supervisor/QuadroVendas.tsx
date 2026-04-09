import { useState, useEffect } from 'react'
import { useRequererPerfil } from '@/hooks/useAuth'
import {
  buscarDadosQuadro,
  listarVendedores,
  type ResumoQuadro,
  type Vendedor,
} from '@/services/analytics'
import Header from '@/components/layout/Header'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, ShoppingBag, DollarSign, BarChart2, Users } from 'lucide-react'

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

export default function QuadroVendas() {
  useRequererPerfil(['supervisor'])

  const [de, setDe] = useState(inicioMes)
  const [ate, setAte] = useState(hoje)
  const [vendedorId, setVendedorId] = useState('')
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [dados, setDados] = useState<ResumoQuadro>(RESUMO_ZERO)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    listarVendedores().then(setVendedores)
  }, [])

  useEffect(() => {
    setCarregando(true)
    buscarDadosQuadro({ de, ate, vendedorId: vendedorId || undefined })
      .then(setDados)
      .catch(console.error)
      .finally(() => setCarregando(false))
  }, [de, ate, vendedorId])

  const diasLegenda = dados.porDia.map((d) => ({
    ...d,
    diaLabel: d.dia.slice(5).replace('-', '/'),
  }))

  const semanasLegenda = dados.porSemana

  return (
    <div className="flex flex-col flex-1">
      <Header titulo="Quadro de Vendas" subtitulo="Análise e indicadores comerciais" />

      <div className="flex-1 p-4 md:p-6 space-y-6">

        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 space-y-2 md:space-y-0 md:flex md:flex-wrap md:items-center md:gap-3">
          {/* Período + atalhos */}
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

          {/* Filtro vendedor */}
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
        </div>

        {carregando && <p className="text-gray-400 text-sm">Carregando...</p>}

        {!carregando && (
          <>
            {/* KPIs principais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CardKpi
                icone={<ShoppingBag size={18} className="text-blue-600" />}
                titulo="Total de Vendas"
                valor={dados.totalVendas.toString()}
                bgIcone="bg-blue-50"
              />
              <CardKpi
                icone={<DollarSign size={18} className="text-green-600" />}
                titulo="Faturamento Total"
                valor={formatarMoeda(dados.valorTotal)}
                bgIcone="bg-green-50"
              />
              <CardKpi
                icone={<TrendingUp size={18} className="text-purple-600" />}
                titulo="Ticket Médio"
                valor={formatarMoeda(dados.ticketMedio)}
                bgIcone="bg-purple-50"
              />
            </div>

            {/* Gráfico de vendas diárias + pizza de forma de pagamento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Barras por dia */}
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
                      <Tooltip
                        formatter={(value: number) => [value, 'Vendas']}
                        labelStyle={{ fontSize: 12 }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="qtd" fill="#1E40AF" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Pizza de forma de pagamento */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <DollarSign size={15} className="text-green-600" />
                  Canal de Vendas
                </p>
                {dados.porFormaPagamento.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados no período</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={dados.porFormaPagamento}
                        dataKey="qtd"
                        nameKey="forma"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ forma, percent }) => `${forma} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {dados.porFormaPagamento.map((_, i) => (
                          <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [v, name]} contentStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {dados.porFormaPagamento.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3 justify-center">
                    {dados.porFormaPagamento.map((f, i) => (
                      <div key={f.forma} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CORES_PIZZA[i % CORES_PIZZA.length] }} />
                        <span className="text-xs text-gray-600">{f.forma} <span className="font-semibold">{f.qtd}</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Comparativo semanal */}
            {semanasLegenda.length > 1 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp size={15} className="text-purple-600" />
                  Comparativo Semanal
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={semanasLegenda} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'qtd' ? [value, 'Vendas'] : [formatarMoeda(value), 'Faturamento']
                      }
                      labelStyle={{ fontSize: 12 }}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="qtd" fill="#1E40AF" radius={[3, 3, 0, 0]} name="qtd" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Rankings lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Ranking de vendedores */}
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
                          i === 0 ? 'bg-yellow-400 text-yellow-900' :
                          i === 1 ? 'bg-gray-300 text-gray-700' :
                          i === 2 ? 'bg-orange-300 text-orange-800' :
                          'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-800 truncate">{v.nome}</p>
                            <span className="text-sm font-bold text-gray-900 flex-shrink-0">{v.qtd}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(v.qtd / dados.porVendedor[0].qtd) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">{formatarMoeda(v.valor)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ranking de bancos/financeiras */}
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
                          i === 0 ? 'bg-yellow-400 text-yellow-900' :
                          i === 1 ? 'bg-gray-300 text-gray-700' :
                          i === 2 ? 'bg-orange-300 text-orange-800' :
                          'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-800 truncate">{b.banco}</p>
                            <span className="text-sm font-bold text-gray-900 flex-shrink-0">{b.qtd}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${(b.qtd / dados.porBanco[0].qtd) * 100}%` }}
                              />
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

            {/* Tabela detalhada por forma de pagamento */}
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
      </div>
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
