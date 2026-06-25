import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, startOfWeek, endOfWeek,
  addMonths, subMonths, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { EventoCalendario } from '@/services/inicio'

interface Props {
  eventos: EventoCalendario[]
  onDiaSelecionado: (data: Date, eventos: EventoCalendario[]) => void
}

const COR_TIPO: Record<string, string> = {
  atividade_setor:    'bg-blue-500',
  pendencia_vendedor: 'bg-amber-500',
  tarefa:             'bg-purple-500',
}

export default function CalendarioAtividades({ eventos, onDiaSelecionado }: Props) {
  const [mesFoco, setMesFoco] = useState(new Date())

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Dias visíveis no calendário (grade 7×6)
  const diasVisiveis = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesFoco), { weekStartsOn: 0 })
    const fim    = endOfWeek(endOfMonth(mesFoco),     { weekStartsOn: 0 })
    return eachDayOfInterval({ start: inicio, end: fim })
  }, [mesFoco])

  // Mapeia eventos por dia (yyyy-MM-dd)
  const eventosPorDia = useMemo(() => {
    const mapa: Record<string, EventoCalendario[]> = {}
    for (const ev of eventos) {
      const chave = format(parseISO(ev.prazo), 'yyyy-MM-dd')
      if (!mapa[chave]) mapa[chave] = []
      mapa[chave].push(ev)
    }
    return mapa
  }, [eventos])

  function eventosNoDia(dia: Date): EventoCalendario[] {
    const chave = format(dia, 'yyyy-MM-dd')
    return eventosPorDia[chave] ?? []
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Cabeçalho do calendário */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={() => setMesFoco((m) => subMonths(m, 1))}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-sm font-semibold text-gray-900 capitalize">
          {format(mesFoco, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <button
          onClick={() => setMesFoco((m) => addMonths(m, 1))}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Grade de dias da semana */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {diasSemana.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-gray-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7">
        {diasVisiveis.map((dia, idx) => {
          const evs     = eventosNoDia(dia)
          const doMes   = isSameMonth(dia, mesFoco)
          const hoje    = isToday(dia)
          const temEvento = evs.length > 0

          // Tipos únicos para os dots
          const tipos = [...new Set(evs.map((e) => e.tipo))]
          const temAberto = evs.some((e) =>
            e.status === 'aberta' || e.status === 'pendente' || e.status === 'aguardando_aprovacao',
          )

          return (
            <button
              key={idx}
              onClick={() => temEvento && onDiaSelecionado(dia, evs)}
              disabled={!temEvento}
              className={`
                relative min-h-[52px] p-1.5 flex flex-col items-center border-b border-r border-gray-100
                transition-colors
                ${doMes ? '' : 'opacity-30'}
                ${temEvento ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}
                ${hoje ? 'bg-blue-50' : ''}
              `}
            >
              {/* Número do dia */}
              <span className={`
                text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                ${hoje ? 'bg-[#1E40AF] text-white' : 'text-gray-700'}
              `}>
                {format(dia, 'd')}
              </span>

              {/* Dots de tipo */}
              {temEvento && (
                <div className="flex gap-0.5 mt-1">
                  {tipos.slice(0, 3).map((tipo) => (
                    <span
                      key={tipo}
                      className={`w-1.5 h-1.5 rounded-full ${COR_TIPO[tipo] ?? 'bg-gray-400'}`}
                    />
                  ))}
                </div>
              )}

              {/* Badge de quantidade se > 1 e tem abertos */}
              {evs.length > 1 && temAberto && (
                <span className="absolute top-1 right-1 text-[9px] font-bold text-amber-700 bg-amber-100 rounded-full w-4 h-4 flex items-center justify-center">
                  {evs.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <LegendaDot cor="bg-blue-500"   label="Setor" />
        <LegendaDot cor="bg-amber-500"  label="Vendedor" />
        <LegendaDot cor="bg-purple-500" label="Tarefa" />
      </div>
    </div>
  )
}

function LegendaDot({ cor, label }: { cor: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cor}`} />
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  )
}
