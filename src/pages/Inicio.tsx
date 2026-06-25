import { useEffect, useState, useCallback } from 'react'
import {
  format, isToday, isTomorrow, isPast, parseISO,
  startOfDay, endOfDay, addDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarClock, Plus, CheckCircle2, Clock, AlertTriangle, Circle,
} from 'lucide-react'
import { listarEventosCalendario, type EventoCalendario } from '@/services/inicio'
import { listarTarefas, concluirTarefa, reabrirTarefa } from '@/services/tarefas'
import { useAuthStore } from '@/store/authStore'
import CalendarioAtividades from '@/components/ui/CalendarioAtividades'
import ModalNovaTarefa from '@/components/tarefas/ModalNovaTarefa'
import ModalDetalhesTarefa from '@/components/tarefas/ModalDetalhesTarefa'
import type { Tarefa } from '@/types'

// ============================================================
// Helpers
// ============================================================

function labelPrazo(prazo: string): { texto: string; classe: string } {
  const data = parseISO(prazo)
  if (isPast(data) && !isToday(data)) return { texto: 'Vencida',      classe: 'text-red-600' }
  if (isToday(data))                  return { texto: 'Hoje',         classe: 'text-amber-600' }
  if (isTomorrow(data))               return { texto: 'Amanhã',       classe: 'text-amber-500' }
  return {
    texto: format(data, "dd/MM - HH'h'mm", { locale: ptBR }),
    classe: 'text-gray-500',
  }
}

const LABEL_TIPO: Record<string, string> = {
  atividade_setor:    'Setor',
  pendencia_vendedor: 'Vendedor',
  tarefa:             'Tarefa',
}

const COR_TIPO: Record<string, string> = {
  atividade_setor:    'bg-blue-100 text-blue-700',
  pendencia_vendedor: 'bg-amber-100 text-amber-700',
  tarefa:             'bg-purple-100 text-purple-700',
}

function estaAtivo(ev: EventoCalendario) {
  return ev.status === 'aberta' || ev.status === 'pendente' || ev.status === 'aguardando_aprovacao'
}

// ============================================================
// Página principal
// ============================================================

export default function Inicio() {
  const { usuario } = useAuthStore()
  const [eventos,   setEventos]   = useState<EventoCalendario[]>([])
  const [tarefas,   setTarefas]   = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto,  setModalAberto]  = useState(false)
  const [tarefaDetalhe, setTarefaDetalhe] = useState<Tarefa | null>(null)

  // Dia selecionado no calendário — null = mostrar lista geral
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null)
  const [eventosDia,     setEventosDia]     = useState<EventoCalendario[]>([])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [evs, tar] = await Promise.all([
        listarEventosCalendario(),
        listarTarefas(),
      ])
      setEventos(evs)
      setTarefas(tar)
    } catch (e) {
      console.error('Erro ao carregar início:', e)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Recalcula eventos do dia ao mudar seleção
  function selecionarDia(data: Date, evs: EventoCalendario[]) {
    setDiaSelecionado(data)
    setEventosDia(evs)
  }

  // KPIs
  const agora      = new Date()
  const amanha     = endOfDay(addDays(agora, 1))
  const ativos     = eventos.filter(estaAtivo)
  const vencidos   = ativos.filter((e) => isPast(parseISO(e.prazo)) && !isToday(parseISO(e.prazo)))
  const hoje       = ativos.filter((e) => isToday(parseISO(e.prazo)))
  const semana     = ativos.filter((e) => {
    const d = parseISO(e.prazo)
    return d >= startOfDay(agora) && d <= amanha
  })

  // Lista a exibir na parte inferior (dia selecionado ou próximas)
  const listaExibida: EventoCalendario[] = diaSelecionado
    ? eventosDia
    : ativos.slice(0, 20)

  async function toggleTarefa(tarefa: Tarefa) {
    if (!usuario) return
    if (tarefa.status === 'aberta') {
      await concluirTarefa(tarefa.id, usuario.id)
    } else {
      await reabrirTarefa(tarefa.id)
    }
    carregar()
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Topo */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            Bom dia{usuario?.nome ? `, ${usuario.nome.split(' ')[0]}` : ''}
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

      {/* Cards KPI */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <CardKPI
          icon={<AlertTriangle size={18} className="text-red-500" />}
          label="Vencidas"
          valor={vencidos.length}
          cor="border-red-200 bg-red-50"
          corValor="text-red-600"
        />
        <CardKPI
          icon={<Clock size={18} className="text-amber-500" />}
          label="Hoje"
          valor={hoje.length}
          cor="border-amber-200 bg-amber-50"
          corValor="text-amber-600"
        />
        <CardKPI
          icon={<CalendarClock size={18} className="text-blue-500" />}
          label="Esta semana"
          valor={semana.length}
          cor="border-blue-200 bg-blue-50"
          corValor="text-blue-600"
        />
      </div>

      {/* Grade: Calendário + Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 xl:gap-6">
        {/* Calendário */}
        <CalendarioAtividades
          eventos={eventos}
          onDiaSelecionado={selecionarDia}
        />

        {/* Painel lateral — tarefas abertas */}
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
                Nenhuma tarefa registrada ainda.
              </p>
            )}
            {tarefas.map((t) => {
              const { texto, classe } = labelPrazo(t.prazo)
              return (
                <div
                  key={t.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 group ${
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
                      : <Circle size={18} />
                    }
                  </button>
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setTarefaDetalhe(t)}
                    title="Ver detalhes"
                  >
                    <p className={`text-sm text-gray-800 truncate group-hover:text-gray-900 ${t.status === 'concluida' ? 'line-through' : ''}`}>
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

      {/* Lista de pendências */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            {diaSelecionado
              ? `Atividades — ${format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR })}`
              : 'Próximas Pendências'}
          </h3>
          {diaSelecionado && (
            <button
              onClick={() => setDiaSelecionado(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Ver todas
            </button>
          )}
        </div>

        {carregando && (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">Carregando...</p>
          </div>
        )}

        {!carregando && listaExibida.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-400">Nenhuma pendência no período.</p>
          </div>
        )}

        {!carregando && listaExibida.length > 0 && (
          <div className="divide-y divide-gray-100">
            {listaExibida.map((ev) => {
              const { texto, classe } = labelPrazo(ev.prazo)
              const ativo = estaAtivo(ev)
              return (
                <div
                  key={ev.id}
                  className={`flex items-center gap-3 px-4 md:px-5 py-3 ${ativo ? '' : 'opacity-50'}`}
                >
                  {/* Indicador de status */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    !ativo
                      ? 'bg-green-400'
                      : isPast(parseISO(ev.prazo)) && !isToday(parseISO(ev.prazo))
                        ? 'bg-red-500'
                        : isToday(parseISO(ev.prazo))
                          ? 'bg-amber-500'
                          : 'bg-gray-300'
                  }`} />

                  {/* Conteúdo */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 truncate">{ev.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${COR_TIPO[ev.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                        {LABEL_TIPO[ev.tipo] ?? ev.tipo}
                      </span>
                      <span className={`text-[11px] ${classe}`}>{texto}</span>
                    </div>
                  </div>

                  {ev.venda && (
                    <span className="text-xs text-gray-400 hidden md:block flex-shrink-0">{ev.venda}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal nova tarefa */}
      <ModalNovaTarefa
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onCriada={carregar}
      />

      {/* Modal detalhes da tarefa */}
      <ModalDetalhesTarefa
        tarefa={tarefaDetalhe}
        onFechar={() => setTarefaDetalhe(null)}
        onAtualizada={carregar}
      />
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
