import { Input } from '@/components/ui/input'
import { startOfMonth, subDays, format } from 'date-fns'

export interface FiltrosPainelState {
  de: string
  ate: string
  status: string
  unidade?: string
}

interface OpcaoStatus {
  valor: string
  label: string
}

interface Props {
  filtros: FiltrosPainelState
  onChange: (f: FiltrosPainelState) => void
  opcoesStatus?: OpcaoStatus[]
  totalExibido?: number
  mostrarFiltroUnidade?: boolean
}

const UNIDADES = [
  { valor: '', label: 'Todos' },
  { valor: 'fd_veiculos', label: 'FD Veículos' },
  { valor: 'fd_motos', label: 'FD Motos' },
]

const hoje = () => format(new Date(), 'yyyy-MM-dd')

const periodos = [
  { label: 'Hoje', fn: (): Partial<FiltrosPainelState> => ({ de: hoje(), ate: hoje() }) },
  { label: '7d', fn: (): Partial<FiltrosPainelState> => ({ de: format(subDays(new Date(), 6), 'yyyy-MM-dd'), ate: hoje() }) },
  { label: 'Mês', fn: (): Partial<FiltrosPainelState> => ({ de: format(startOfMonth(new Date()), 'yyyy-MM-dd'), ate: hoje() }) },
  { label: '30d', fn: (): Partial<FiltrosPainelState> => ({ de: format(subDays(new Date(), 29), 'yyyy-MM-dd'), ate: hoje() }) },
  { label: 'Tudo', fn: (): Partial<FiltrosPainelState> => ({ de: '', ate: '' }) },
]

export const STATUS_ATIVIDADE: OpcaoStatus[] = [
  { valor: '', label: 'Todos' },
  { valor: 'pendente', label: 'Pendentes' },
  { valor: 'concluida', label: 'Concluídos' },
]

export const STATUS_VENDA: OpcaoStatus[] = [
  { valor: '', label: 'Todos' },
  { valor: 'pendencia_vendedor', label: 'Com pendência' },
  { valor: 'iniciada', label: 'Em andamento' },
  { valor: 'concluida', label: 'Concluída' },
]

export const STATUS_TRANSFERENCIA: OpcaoStatus[] = [
  { valor: '', label: 'Todos' },
  { valor: 'enviado', label: 'No despachante' },
  { valor: 'pendencia', label: 'Com pendência' },
  { valor: 'concluido', label: 'Concluído' },
]

export default function FiltrosPainel({ filtros, onChange, opcoesStatus, totalExibido, mostrarFiltroUnidade }: Props) {
  const periodoAtivo = periodos.find((p) => {
    const r = p.fn()
    return r.de === filtros.de && r.ate === filtros.ate
  })

  function set(partial: Partial<FiltrosPainelState>) {
    onChange({ ...filtros, ...partial })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-3 space-y-2 md:space-y-0 md:flex md:flex-wrap md:items-center md:gap-3 md:px-4">

      {/* Linha 1 no mobile: botões rápidos + datas */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Períodos rápidos */}
        {periodos.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => set(p.fn())}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              periodoAtivo?.label === p.label
                ? 'bg-[#1E40AF] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}

        {/* Separador visível só em md+ */}
        <div className="hidden md:block w-px h-5 bg-gray-200 mx-1" />

        {/* Datas */}
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={filtros.de}
            onChange={(e) => set({ de: e.target.value })}
            className="h-7 text-xs w-[126px] px-2"
          />
          <span className="text-xs text-gray-400">→</span>
          <Input
            type="date"
            value={filtros.ate}
            onChange={(e) => set({ ate: e.target.value })}
            className="h-7 text-xs w-[126px] px-2"
          />
        </div>
      </div>

      {/* Linha 2 no mobile: status + contagem */}
      {opcoesStatus && opcoesStatus.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <div className="hidden md:block w-px h-5 bg-gray-200 mr-1" />
          {opcoesStatus.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => set({ status: o.valor })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filtros.status === o.valor
                  ? 'bg-[#1E40AF] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {o.label}
            </button>
          ))}

          {totalExibido !== undefined && (
            <span className="ml-auto text-xs text-gray-400 pl-2">
              {totalExibido} resultado{totalExibido !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Contagem quando não há status filter */}
      {(!opcoesStatus || opcoesStatus.length === 0) && totalExibido !== undefined && (
        <span className="text-xs text-gray-400 md:ml-auto">
          {totalExibido} resultado{totalExibido !== 1 ? 's' : ''}
        </span>
      )}

      {/* Filtro de unidade */}
      {mostrarFiltroUnidade && (
        <div className="flex items-center gap-1 flex-wrap">
          <div className="hidden md:block w-px h-5 bg-gray-200 mr-1" />
          <span className="text-xs text-gray-400 mr-0.5">Unidade:</span>
          {UNIDADES.map((u) => (
            <button
              key={u.valor}
              type="button"
              onClick={() => set({ unidade: u.valor })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                (filtros.unidade ?? '') === u.valor
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
