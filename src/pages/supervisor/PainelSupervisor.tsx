import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequererPerfil } from '@/hooks/useAuth'
import {
  buscarResumo,
  listarPendenciasAprovacao,
  aprovarPendencia,
  rejeitarPendencia,
  periodoAtual,
  type PendenciaComVenda,
  type ResumoSupervisor,
} from '@/services/supervisor'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, XCircle, AlertTriangle, Clock,
  ShoppingBag, FileText, DollarSign, Receipt, Truck,
  ChevronRight, CalendarRange,
} from 'lucide-react'

const SETORES = [
  { chave: 'contratos', label: 'Contratos', icone: FileText, cor: 'blue' },
  { chave: 'financeiro', label: 'Financeiro', icone: DollarSign, cor: 'green' },
  { chave: 'fiscal', label: 'Fiscal', icone: Receipt, cor: 'purple' },
  { chave: 'transferencia', label: 'Transferência', icone: Truck, cor: 'orange' },
] as const

type SetorChave = typeof SETORES[number]['chave']

const RESUMO_ZERO: ResumoSupervisor = {
  totalVendas: 0, vendasHoje: 0, pendenciasVendedor: 0, pendenciasVencidas: 0, aguardandoAprovacao: 0,
  pendenciasTransferencia: 0,
  setores: {
    contratos: { pendentes: 0, concluidas: 0 },
    financeiro: { pendentes: 0, concluidas: 0 },
    fiscal: { pendentes: 0, concluidas: 0 },
    transferencia: { pendentes: 0, concluidas: 0 },
  },
}

export default function PainelSupervisor() {
  useRequererPerfil(['supervisor'])
  const navigate = useNavigate()

  const periodo = periodoAtual()
  const [de, setDe] = useState(periodo.de)
  const [ate, setAte] = useState(periodo.ate)

  const [resumo, setResumo] = useState<ResumoSupervisor>(RESUMO_ZERO)
  const [pendencias, setPendencias] = useState<PendenciaComVenda[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [processando, setProcessando] = useState<string | null>(null)

  async function carregar() {
    setCarregando(true)
    setErro(null)
    const [r, p] = await Promise.allSettled([
      buscarResumo(de, ate),
      listarPendenciasAprovacao(),
    ])

    if (r.status === 'fulfilled') setResumo(r.value)
    else {
      console.error('[supervisor] buscarResumo:', r.reason)
      setErro(`Erro ao carregar resumo: ${r.reason?.message ?? r.reason}`)
    }
    if (p.status === 'fulfilled') setPendencias(p.value)
    else console.error('[supervisor] pendencias:', p.reason)

    setCarregando(false)
  }

  useEffect(() => { carregar() }, [de, ate])

  function irPara(tipo: string, extra?: Record<string, string>) {
    const params = new URLSearchParams({ tipo, de, ate, ...extra })
    navigate(`/supervisor/lista?${params}`)
  }

  async function aprovar(id: string) {
    setProcessando(id)
    try { await aprovarPendencia(id); await carregar() }
    finally { setProcessando(null) }
  }

  async function rejeitar(id: string) {
    setProcessando(id)
    try { await rejeitarPendencia(id); await carregar() }
    finally { setProcessando(null) }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header titulo="Supervisão" subtitulo="Visão geral do sistema" />

      <div className="flex-1 p-4 md:p-6 space-y-6">

        {/* Filtro de período */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 space-y-2 md:space-y-0 md:flex md:items-center md:gap-4 md:flex-wrap">
          <div className="flex items-center gap-2 text-gray-500">
            <CalendarRange size={16} />
            <span className="text-sm font-medium">Período</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-gray-400 text-sm">até</span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-1.5 flex-wrap md:ml-auto">
            {[
              { label: 'Hoje', fn: () => { const h = new Date().toISOString().split('T')[0]; setDe(h); setAte(h) } },
              { label: '7d', fn: () => { const h = new Date(); const s = new Date(h); s.setDate(s.getDate() - 6); setDe(s.toISOString().split('T')[0]); setAte(h.toISOString().split('T')[0]) } },
              { label: 'Mês', fn: () => { const h = new Date(); setDe(new Date(h.getFullYear(), h.getMonth(), 1).toISOString().split('T')[0]); setAte(h.toISOString().split('T')[0]) } },
              { label: '30d', fn: () => { const h = new Date(); const s = new Date(h); s.setDate(s.getDate() - 29); setDe(s.toISOString().split('T')[0]); setAte(h.toISOString().split('T')[0]) } },
            ].map(({ label, fn }) => (
              <button key={label} onClick={fn}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>

        {carregando && <p className="text-gray-400 text-sm">Carregando...</p>}

        {!carregando && erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{erro}</div>
        )}

        {!carregando && (
          <>
            {/* Cards principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <CardClicavel
                icone={<ShoppingBag size={18} className="text-blue-600" />}
                titulo="Total de Vendas"
                valor={resumo.totalVendas}
                sub={`${de} → ${ate}`}
                bgIcone="bg-blue-50"
                onClick={() => irPara('vendas')}
              />
              <CardClicavel
                icone={<Clock size={18} className="text-amber-600" />}
                titulo="Pendências Vendedor"
                valor={resumo.pendenciasVendedor}
                bgIcone="bg-amber-50"
                onClick={() => irPara('pendencias')}
              />
              <CardClicavel
                icone={<AlertTriangle size={18} className="text-red-600" />}
                titulo="Vencidas"
                valor={resumo.pendenciasVencidas}
                bgIcone="bg-red-50"
                onClick={() => irPara('vencidas')}
              />
              <CardClicavel
                icone={<CheckCircle2 size={18} className="text-green-600" />}
                titulo="Aguardando Aprovação"
                valor={resumo.aguardandoAprovacao}
                bgIcone="bg-green-50"
                onClick={() => irPara('aprovacao')}
              />
            </div>

            {/* Cards por setor */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status por Setor</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {SETORES.map(({ chave, label, icone: Icone, cor }) => {
                  const dados = resumo.setores[chave as SetorChave]
                  const total = dados.pendentes + dados.concluidas
                  const pct = total > 0 ? Math.round((dados.concluidas / total) * 100) : 0
                  return (
                    <div
                      key={chave}
                      onClick={() => irPara('setor', { setor: chave })}
                      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icone size={15} className={`text-${cor}-600`} />
                          <p className="text-sm font-medium text-gray-700">{label}</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xl font-bold text-gray-900">
                            {dados.concluidas}
                            <span className="text-sm font-normal text-gray-400">/{total}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">concluídas</p>
                        </div>
                        <p className={`text-sm font-semibold ${dados.pendentes > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {dados.pendentes} pend.
                        </p>
                      </div>
                      {chave === 'transferencia' && resumo.pendenciasTransferencia > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                          <AlertTriangle size={11} className="text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-amber-700 font-medium">
                            {resumo.pendenciasTransferencia} pend. antes do despachante
                          </p>
                        </div>
                      )}
                      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-${cor}-500 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pendências aguardando aprovação */}
            {pendencias.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Aguardando Aprovação do Supervisor ({pendencias.length})
                </p>
                <div className="space-y-2">
                  {pendencias.map((p) => {
                    const venda = p.sales as unknown as { marca: string; modelo: string; placa: string }
                    const usuario = p.users as unknown as { nome: string }
                    return (
                      <div key={p.id} className="bg-white border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {p.tipo === 'vistoria' ? 'Vistoria do veículo' : 'Reconhecimento de firma / GOV.BR'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Vendedor: <span className="font-medium">{usuario?.nome}</span>
                            {' · '}{venda?.marca} {venda?.modelo}
                            {' — '}<span className="font-mono uppercase">{venda?.placa}</span>
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-xs"
                            onClick={() => aprovar(p.id)} disabled={processando === p.id}>
                            <CheckCircle2 size={12} className="mr-1" /> Aprovar
                          </Button>
                          <Button size="sm" variant="outline"
                            className="h-8 text-red-600 border-red-200 hover:bg-red-50 text-xs"
                            onClick={() => rejeitar(p.id)} disabled={processando === p.id}>
                            <XCircle size={12} className="mr-1" /> Devolver
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------

function CardClicavel({
  icone, titulo, valor, sub, bgIcone, onClick,
}: {
  icone: React.ReactNode
  titulo: string
  valor: number
  sub?: string
  bgIcone: string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${bgIcone} flex items-center justify-center mb-3`}>
          {icone}
        </div>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors mt-1" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{valor}</p>
      <p className="text-xs text-gray-500 mt-0.5">{titulo}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

