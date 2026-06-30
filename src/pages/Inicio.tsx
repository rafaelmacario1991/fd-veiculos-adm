import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  format, isToday, isTomorrow, isPast, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarClock, Plus, CheckCircle2, Clock, AlertTriangle, Circle, Trash2,
  User, FileText, DollarSign, FileCheck, Truck, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  listarEventosCalendario, excluirEventoPendencia,
  listarPendenciasDoVendedor, listarAtividadesDoSetor,
  type EventoCalendario,
} from '@/services/inicio'
import { listarTarefas, concluirTarefa, reabrirTarefa } from '@/services/tarefas'
import { useAuthStore } from '@/store/authStore'
import CalendarioAtividades from '@/components/ui/CalendarioAtividades'
import ModalNovaTarefa from '@/components/tarefas/ModalNovaTarefa'
import ModalDetalhesTarefa from '@/components/tarefas/ModalDetalhesTarefa'
import type { Tarefa, Perfil } from '@/types'

// ============================================================
// Helpers
// ============================================================

function labelPrazo(prazo: string): { texto: string; classe: string } {
  const data = parseISO(prazo)
  if (isPast(data) && !isToday(data)) return { texto: 'Vencida',  classe: 'text-red-600 font-medium' }
  if (isToday(data))                  return { texto: 'Hoje',     classe: 'text-amber-600 font-medium' }
  if (isTomorrow(data))               return { texto: 'Amanhã',   classe: 'text-amber-500' }
  return {
    texto: format(data, "dd/MM · HH'h'mm", { locale: ptBR }),
    classe: 'text-gray-400',
  }
}

function estaAtivo(ev: EventoCalendario) {
  return ev.status === 'aberta' || ev.status === 'pendente' || ev.status === 'aguardando_aprovacao'
}

function getIconeSetor(chave: string) {
  switch (chave) {
    case 'vendedor':      return <User size={16} />
    case 'contratos':     return <FileText size={16} />
    case 'financeiro':    return <DollarSign size={16} />
    case 'fiscal':        return <FileCheck size={16} />
    case 'transferencia': return <Truck size={16} />
    default:              return <Circle size={16} />
  }
}

const CONF_SETOR: Record<string, { titulo: string; corIcone: string }> = {
  vendedor:      { titulo: 'Minhas Pendências',  corIcone: 'bg-amber-100 text-amber-700' },
  contratos:     { titulo: 'Contratos',          corIcone: 'bg-blue-100 text-blue-700' },
  financeiro:    { titulo: 'Financeiro',         corIcone: 'bg-green-100 text-green-700' },
  fiscal:        { titulo: 'Fiscal',             corIcone: 'bg-purple-100 text-purple-700' },
  transferencia: { titulo: 'Transferência',      corIcone: 'bg-orange-100 text-orange-700' },
}

const ORDEM_PAINEIS = ['vendedor', 'contratos', 'financeiro', 'fiscal', 'transferencia']

// ============================================================
// Sub-componente: Barra de status segmentada (CSS puro)
// ============================================================
function BarraStatus({ vencidos, hoje, futuras }: { vencidos: number; hoje: number; futuras: number }) {
  const total = vencidos + hoje + futuras
  if (total === 0) return <div className="h-1.5 rounded-full bg-green-100" />
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
      {vencidos > 0 && <div style={{ flex: vencidos }} className="bg-red-500" />}
      {hoje    > 0 && <div style={{ flex: hoje    }} className="bg-amber-400" />}
      {futuras > 0 && <div style={{ flex: futuras }} className="bg-blue-300" />}
    </div>
  )
}

// ============================================================
// Sub-componente: Painel de pendências por perfil/setor
// ============================================================
interface PainelProps {
  chave: string
  titulo: string
  corIcone: string
  itens: EventoCalendario[]
  carregando: boolean
  onVerVenda: (saleId: string) => void
}

function PainelPendencias({ chave, titulo, corIcone, itens, carregando, onVerVenda }: PainelProps) {
  const [expandido, setExpandido] = useState(false)

  const ativos   = itens.filter(estaAtivo)
  const vencidos = ativos.filter((i) => isPast(parseISO(i.prazo)) && !isToday(parseISO(i.prazo)))
  const hoje     = ativos.filter((i) => isToday(parseISO(i.prazo)))
  const futuras  = ativos.filter((i) => !isPast(parseISO(i.prazo)))
  const temAlerta = vencidos.length > 0
  const tudoOk    = !carregando && ativos.length === 0

  return (
    <div className={`bg-white rounded-xl border overflow-hidden shadow-sm transition-shadow ${
      temAlerta ? 'border-red-200 shadow-red-50' : 'border-gray-200'
    }`}>
      {/* Header clicável */}
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${corIcone}`}>
          {getIconeSetor(chave)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{titulo}</p>
            {temAlerta && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex-shrink-0">
                {vencidos.length} vencida{vencidos.length !== 1 ? 's' : ''}
              </span>
            )}
            {tudoOk && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                Em dia
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {carregando ? 'Carregando...' : `${ativos.length} em aberto`}
          </p>
        </div>
        {expandido
          ? <ChevronUp size={15} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />}
      </button>

      {/* Barra visual + legenda */}
      <div className="px-4 pb-3">
        <BarraStatus vencidos={vencidos.length} hoje={hoje.length} futuras={futuras.length} />
        {!carregando && (
          <div className="flex items-center gap-4 mt-1.5">
            {vencidos.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {vencidos.length} vencida{vencidos.length !== 1 ? 's' : ''}
              </span>
            )}
            {hoje.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                {hoje.length} hoje
              </span>
            )}
            {futuras.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-blue-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 inline-block" />
                {futuras.length} em aberto
              </span>
            )}
            {tudoOk && (
              <span className="text-[10px] text-green-600 font-medium">Tudo em dia ✓</span>
            )}
          </div>
        )}
      </div>

      {/* Lista expandida */}
      {expandido && (
        <div className="border-t border-gray-100 max-h-64 overflow-y-auto divide-y divide-gray-50">
          {carregando && (
            <p className="text-sm text-gray-400 text-center py-6">Carregando...</p>
          )}
          {!carregando && ativos.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma pendência em aberto.</p>
          )}
          {ativos.map((item) => {
            const { texto, classe } = labelPrazo(item.prazo)
            const eVencida = isPast(parseISO(item.prazo)) && !isToday(parseISO(item.prazo))
            const eHoje    = isToday(parseISO(item.prazo))
            return (
              <button
                key={item.id}
                onClick={() => item.sale_id ? onVerVenda(item.sale_id) : undefined}
                disabled={!item.sale_id}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group disabled:cursor-default"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  eVencida ? 'bg-red-500' : eHoje ? 'bg-amber-400' : 'bg-blue-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate group-hover:text-gray-900 group-disabled:group-hover:text-gray-800">
                    {item.titulo}
                  </p>
                  <p className={`text-[11px] ${classe}`}>{texto}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Sub-componente: Card KPI
// ============================================================
function CardKPI({
  icon, label, valor, cor, corValor,
}: {
  icon: React.ReactNode
  label: string
  valor: number
  cor: string
  corValor: string
}) {
  return (
    <div className={`rounded-xl border p-3 md:p-4 flex flex-col gap-2 ${cor}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-600 hidden sm:inline">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${corValor}`}>{valor}</p>
      <p className="text-[11px] text-gray-500 sm:hidden">{label}</p>
    </div>
  )
}

// ============================================================
// Página principal
// ============================================================
export default function Inicio() {
  const { usuario, temPerfil } = useAuthStore()
  const ehSupervisor = temPerfil('supervisor')
  const navigate = useNavigate()

  // Dados do calendário + tarefas
  const [eventos,    setEventos]    = useState<EventoCalendario[]>([])
  const [tarefas,    setTarefas]    = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)

  // Dados dos painéis adaptativos
  const [painelDados,        setPainelDados]        = useState<Record<string, EventoCalendario[]>>({})
  const [carregandoPaineis,  setCarregandoPaineis]  = useState(true)

  // Modais
  const [modalAberto,   setModalAberto]   = useState(false)
  const [tarefaDetalhe, setTarefaDetalhe] = useState<Tarefa | null>(null)

  // Seleção de dia no calendário
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null)
  const [eventosDia,     setEventosDia]     = useState<EventoCalendario[]>([])

  // Carrega calendário e tarefas (dados globais para o calendário)
  const carregarCalendario = useCallback(async () => {
    setCarregando(true)
    try {
      const [evs, tar] = await Promise.all([listarEventosCalendario(), listarTarefas()])
      setEventos(evs)
      setTarefas(tar)
    } catch (e) {
      console.error('Erro ao carregar calendário:', e)
    } finally {
      setCarregando(false)
    }
  }, [])

  // Carrega dados dos painéis filtrados por perfil
  // Usa getState() para ler o perfil sem criar dependência instável
  const carregarPaineis = useCallback(async () => {
    const { temPerfil: tp, usuario: u } = useAuthStore.getState()
    if (!u) return
    setCarregandoPaineis(true)
    try {
      const novos: Record<string, EventoCalendario[]> = {}

      if (tp('vendedor')) {
        novos['vendedor'] = await listarPendenciasDoVendedor(u.id)
      }

      const setores: Perfil[] = ['contratos', 'financeiro', 'fiscal', 'transferencia']
      const visiveis = tp('supervisor') ? setores : setores.filter((s) => tp(s))
      const resultados = await Promise.all(
        visiveis.map((s) => listarAtividadesDoSetor(s).then((itens) => ({ s, itens })))
      )
      for (const { s, itens } of resultados) novos[s] = itens

      setPainelDados(novos)
    } catch (e) {
      console.error('Erro ao carregar painéis:', e)
    } finally {
      setCarregandoPaineis(false)
    }
  }, [])

  function recarregarTudo() {
    carregarCalendario()
    carregarPaineis()
  }

  useEffect(() => { recarregarTudo() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // KPIs derivados dos painéis
  const todosAtivos  = Object.values(painelDados).flat().filter(estaAtivo)
  const kpiVencidos  = todosAtivos.filter((e) => isPast(parseISO(e.prazo)) && !isToday(parseISO(e.prazo)))
  const kpiHoje      = todosAtivos.filter((e) => isToday(parseISO(e.prazo)))
  const kpiEmAberto  = todosAtivos.filter((e) => !isPast(parseISO(e.prazo)))

  // Calendário
  function selecionarDia(data: Date, evs: EventoCalendario[]) {
    setDiaSelecionado(data)
    setEventosDia(evs)
  }
  const listaCalendario = diaSelecionado
    ? eventosDia
    : eventos.filter(estaAtivo).slice(0, 15)

  async function excluirPendencia(ev: EventoCalendario) {
    if (!confirm(`Excluir "${ev.titulo}"?`)) return
    try {
      await excluirEventoPendencia(ev.id, ev.tipo)
      recarregarTudo()
    } catch { /* silent */ }
  }

  async function toggleTarefa(tarefa: Tarefa) {
    if (!usuario) return
    if (tarefa.status === 'aberta') await concluirTarefa(tarefa.id, usuario.id)
    else await reabrirTarefa(tarefa.id)
    carregarCalendario()
  }

  // Painéis a exibir, na ordem definida
  const paineisVisiveis = ORDEM_PAINEIS.filter((p) => p in painelDados)

  // Colunas do grid de painéis
  const colsPaineis =
    paineisVisiveis.length === 1 ? 'grid-cols-1 max-w-sm' :
    paineisVisiveis.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
    paineisVisiveis.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
    'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'

  const hora      = new Date().getHours()
  const saudacao  = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = usuario?.nome?.split(' ')[0] ?? ''

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Topo */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {saudacao}{primeiroNome ? `, ${primeiroNome}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1E40AF] rounded-lg hover:bg-blue-800 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nova Atividade</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <CardKPI
          icon={<AlertTriangle size={18} className="text-red-500" />}
          label="Vencidas"
          valor={carregandoPaineis ? 0 : kpiVencidos.length}
          cor="border-red-200 bg-red-50"
          corValor="text-red-600"
        />
        <CardKPI
          icon={<Clock size={18} className="text-amber-500" />}
          label="Vencem hoje"
          valor={carregandoPaineis ? 0 : kpiHoje.length}
          cor="border-amber-200 bg-amber-50"
          corValor="text-amber-600"
        />
        <CardKPI
          icon={<CalendarClock size={18} className="text-blue-500" />}
          label="Em aberto"
          valor={carregandoPaineis ? 0 : kpiEmAberto.length}
          cor="border-blue-200 bg-blue-50"
          corValor="text-blue-600"
        />
      </div>

      {/* Painéis adaptativos por perfil */}
      {paineisVisiveis.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Seus painéis
          </p>
          <div className={`grid gap-3 ${colsPaineis}`}>
            {paineisVisiveis.map((chave) => {
              const conf = CONF_SETOR[chave]
              return (
                <PainelPendencias
                  key={chave}
                  chave={chave}
                  titulo={conf.titulo}
                  corIcone={conf.corIcone}
                  itens={painelDados[chave] ?? []}
                  carregando={carregandoPaineis}
                  onVerVenda={(saleId) => navigate(`/venda/${saleId}`)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Grade: Calendário + Tarefas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

        {/* Calendário com lista de atividades abaixo */}
        <div className="space-y-3">
          <CalendarioAtividades eventos={eventos} onDiaSelecionado={selecionarDia} />

          {listaCalendario.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500">
                  {diaSelecionado
                    ? format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR })
                    : 'Próximas atividades'}
                </p>
                {diaSelecionado && (
                  <button
                    onClick={() => setDiaSelecionado(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Ver todas
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                {listaCalendario.map((ev) => {
                  const { texto, classe } = labelPrazo(ev.prazo)
                  const eVencida = isPast(parseISO(ev.prazo)) && !isToday(parseISO(ev.prazo))
                  return (
                    <div key={ev.id} className="flex items-center gap-3 px-4 py-2 group">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        eVencida ? 'bg-red-500' : isToday(parseISO(ev.prazo)) ? 'bg-amber-400' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">{ev.titulo}</p>
                      </div>
                      <span className={`text-[10px] flex-shrink-0 ${classe}`}>{texto}</span>
                      {ehSupervisor && (
                        <button
                          onClick={() => excluirPendencia(ev)}
                          className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!carregando && listaCalendario.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-6 text-center shadow-sm">
              <p className="text-sm text-gray-400">
                {diaSelecionado ? 'Nenhuma atividade nesse dia.' : 'Nenhuma atividade pendente.'}
              </p>
            </div>
          )}
        </div>

        {/* Minhas Tarefas */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Minhas Tarefas</h3>
            <button
              onClick={() => setModalAberto(true)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={13} /> Adicionar
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {tarefas.length === 0 && !carregando && (
              <p className="text-sm text-gray-400 text-center py-10 px-4">
                Nenhuma tarefa registrada.
              </p>
            )}
            {tarefas.map((t) => {
              const { texto, classe } = labelPrazo(t.prazo)
              return (
                <div
                  key={t.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 group transition-colors ${
                    t.status === 'concluida' ? 'opacity-50' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleTarefa(t)}
                    className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-blue-600 transition-colors"
                    title={t.status === 'concluida' ? 'Reabrir' : 'Concluir'}
                  >
                    {t.status === 'concluida'
                      ? <CheckCircle2 size={18} className="text-green-500" />
                      : <Circle size={18} />}
                  </button>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setTarefaDetalhe(t)}>
                    <p className={`text-sm text-gray-800 truncate ${t.status === 'concluida' ? 'line-through' : ''}`}>
                      {t.titulo}
                    </p>
                    {t.descricao && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{t.descricao}</p>
                    )}
                    <p className={`text-[11px] mt-1 ${classe}`}>{texto}</p>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modais */}
      <ModalNovaTarefa
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onCriada={carregarCalendario}
      />
      <ModalDetalhesTarefa
        tarefa={tarefaDetalhe}
        onFechar={() => setTarefaDetalhe(null)}
        onAtualizada={carregarCalendario}
      />
    </div>
  )
}
