import { useState, useEffect, useCallback } from 'react'
import { isPast, isToday, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, CheckCircle2, AlertTriangle, Clock,
  Paperclip, ChevronDown, ChevronRight,
} from 'lucide-react'
import { listarTarefas } from '@/services/tarefas'
import ModalNovaTarefa from './ModalNovaTarefa'
import ModalDetalhesTarefa from './ModalDetalhesTarefa'
import type { Tarefa } from '@/types'

interface Props {
  setor: string
}

function labelPrazo(prazo: string, status: string) {
  if (status === 'concluida') return { texto: 'Concluída', classe: 'text-green-600' }
  const data = parseISO(prazo)
  if (isPast(data) && !isToday(data)) return { texto: 'Vencida',        classe: 'text-red-600' }
  if (isToday(data))                  return { texto: 'Hoje',           classe: 'text-amber-600' }
  return {
    texto: format(data, "dd/MM · HH'h'mm", { locale: ptBR }),
    classe: 'text-gray-500',
  }
}

export default function SecaoTarefasSetor({ setor }: Props) {
  const [tarefas,       setTarefas]       = useState<Tarefa[]>([])
  const [carregando,    setCarregando]    = useState(true)
  const [modalNova,     setModalNova]     = useState(false)
  const [tarefaDetalhe, setTarefaDetalhe] = useState<Tarefa | null>(null)
  const [expandido,     setExpandido]     = useState(true)
  const [mostrarFeitas, setMostrarFeitas] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setTarefas(await listarTarefas(setor))
    } finally {
      setCarregando(false)
    }
  }, [setor])

  useEffect(() => { carregar() }, [carregar])

  const abertas    = tarefas.filter((t) => t.status === 'aberta')
  const concluidas = tarefas.filter((t) => t.status === 'concluida')
  const vencidas   = abertas.filter((t) => isPast(parseISO(t.prazo)) && !isToday(parseISO(t.prazo)))

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

      {/* ── Cabeçalho ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-pointer select-none hover:bg-gray-50 transition-colors"
        onClick={() => setExpandido((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {expandido
            ? <ChevronDown size={14} className="text-gray-400" />
            : <ChevronRight size={14} className="text-gray-400" />
          }
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Atividades do Setor
          </p>
          {abertas.length > 0 && (
            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
              {abertas.length}
            </span>
          )}
          {vencidas.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full px-1.5 py-0.5">
              <AlertTriangle size={9} />
              {vencidas.length} vencida{vencidas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setModalNova(true) }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
          title="Nova atividade"
        >
          <Plus size={13} />
          Nova
        </button>
      </div>

      {/* ── Lista ── */}
      {expandido && (
        <div>
          {carregando && (
            <p className="text-xs text-gray-400 px-4 py-3">Carregando...</p>
          )}

          {!carregando && tarefas.length === 0 && (
            <div className="text-center py-6 px-4">
              <p className="text-xs text-gray-400">Nenhuma atividade registrada.</p>
              <button
                onClick={() => setModalNova(true)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Criar primeira atividade
              </button>
            </div>
          )}

          {/* Abertas */}
          {abertas.length > 0 && (
            <div className="divide-y divide-gray-50">
              {abertas.map((t) => (
                <ItemTarefa
                  key={t.id}
                  tarefa={t}
                  onClick={() => setTarefaDetalhe(t)}
                />
              ))}
            </div>
          )}

          {/* Concluídas — toggle */}
          {concluidas.length > 0 && (
            <>
              <button
                onClick={() => setMostrarFeitas((v) => !v)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
              >
                <CheckCircle2 size={12} className="text-green-500" />
                {concluidas.length} concluída{concluidas.length !== 1 ? 's' : ''}
                <span className="ml-auto">{mostrarFeitas ? '▲' : '▼'}</span>
              </button>

              {mostrarFeitas && (
                <div className="divide-y divide-gray-50">
                  {concluidas.map((t) => (
                    <ItemTarefa
                      key={t.id}
                      tarefa={t}
                      onClick={() => setTarefaDetalhe(t)}
                      concluida
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modais ── */}
      <ModalNovaTarefa
        aberto={modalNova}
        onFechar={() => setModalNova(false)}
        onCriada={carregar}
        setorPadrao={setor}
      />
      <ModalDetalhesTarefa
        tarefa={tarefaDetalhe}
        onFechar={() => setTarefaDetalhe(null)}
        onAtualizada={carregar}
      />
    </div>
  )
}

// ── Item da lista ────────────────────────────────────────────
function ItemTarefa({
  tarefa, onClick, concluida = false,
}: {
  tarefa: Tarefa
  onClick: () => void
  concluida?: boolean
}) {
  const { texto, classe } = labelPrazo(tarefa.prazo, tarefa.status)
  const vencida = tarefa.status === 'aberta'
    && isPast(parseISO(tarefa.prazo))
    && !isToday(parseISO(tarefa.prazo))

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
        hover:bg-gray-50 group
        ${concluida ? 'opacity-60' : ''}
      `}
    >
      {/* Indicador lateral */}
      <span className={`
        mt-1 w-2 h-2 rounded-full flex-shrink-0
        ${concluida
          ? 'bg-green-400'
          : vencida
            ? 'bg-red-500'
            : isToday(parseISO(tarefa.prazo))
              ? 'bg-amber-400'
              : 'bg-blue-400'
        }
      `} />

      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${concluida ? 'line-through text-gray-500' : 'text-gray-800'} group-hover:text-gray-900`}>
          {tarefa.titulo}
        </p>

        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {/* Prazo */}
          <span className={`flex items-center gap-1 text-[11px] ${classe}`}>
            <Clock size={10} />
            {texto}
          </span>

          {/* Responsável */}
          {tarefa.responsavel && (
            <span className="text-[11px] text-gray-400 truncate">
              {tarefa.responsavel.nome}
            </span>
          )}

          {/* Anexo */}
          {tarefa.anexo_nome && (
            <span className="flex items-center gap-0.5 text-[11px] text-blue-500">
              <Paperclip size={10} />
              Doc
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-1 transition-colors" />
    </button>
  )
}
