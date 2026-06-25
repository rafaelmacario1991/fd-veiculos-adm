import { useState } from 'react'
import {
  format, isPast, isToday, parseISO, addDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  X, Paperclip, CheckCircle2, RotateCcw, CalendarClock,
  User, Users, Clock, Building2, FileText, Trash2,
} from 'lucide-react'
import { concluirTarefa, reabrirTarefa, adiarTarefa, urlAssinadaAnexo, deletarTarefa } from '@/services/tarefas'
import { useAuthStore } from '@/store/authStore'
import type { Tarefa } from '@/types'

const LABEL_SETOR: Record<string, string> = {
  contratos:     'Contratos',
  financeiro:    'Financeiro',
  fiscal:        'Fiscal',
  transferencia: 'Transferência',
  supervisor:    'Supervisor',
  vendedor:      'Vendedor',
}

interface Props {
  tarefa: Tarefa | null
  onFechar: () => void
  onAtualizada: () => void
}

export default function ModalDetalhesTarefa({ tarefa, onFechar, onAtualizada }: Props) {
  const { usuario } = useAuthStore()
  const [processando,   setProcessando]   = useState(false)
  const [adiando,       setAdiando]       = useState(false)
  const [novoPrazo,     setNovoPrazo]     = useState('')
  const [erroAdiamento, setErroAdiamento] = useState('')

  if (!tarefa) return null

  // Alias não-nulo para uso em closures assíncronas
  const t = tarefa

  // ── Helpers de prazo ──────────────────────────────────────────
  const dataFim   = parseISO(t.prazo)
  const vencida   = isPast(dataFim) && !isToday(dataFim) && t.status === 'aberta'
  const hoje      = isToday(dataFim) && t.status === 'aberta'

  function badgePrazo() {
    if (t.status === 'concluida')
      return { label: 'Concluída',     cor: 'bg-green-100 text-green-700' }
    if (vencida)
      return { label: 'Vencida',        cor: 'bg-red-100 text-red-700' }
    if (hoje)
      return { label: 'Vence hoje',     cor: 'bg-amber-100 text-amber-700' }
    return   { label: 'Em andamento',   cor: 'bg-blue-100 text-blue-700' }
  }

  const { label: badgeLabel, cor: badgeCor } = badgePrazo()

  // ── Ações ─────────────────────────────────────────────────────
  async function handleConcluir() {
    if (!usuario) return
    setProcessando(true)
    try {
      await concluirTarefa(t.id, usuario.id)
      onAtualizada()
      onFechar()
    } finally {
      setProcessando(false)
    }
  }

  async function handleReabrir() {
    setProcessando(true)
    try {
      await reabrirTarefa(t.id)
      onAtualizada()
      onFechar()
    } finally {
      setProcessando(false)
    }
  }

  async function handleAdiar() {
    if (!novoPrazo) { setErroAdiamento('Informe a nova data'); return }
    const nova = new Date(novoPrazo)
    if (nova <= new Date()) { setErroAdiamento('A nova data deve ser futura'); return }
    setProcessando(true)
    setErroAdiamento('')
    try {
      await adiarTarefa(t.id, nova.toISOString())
      onAtualizada()
      onFechar()
    } finally {
      setProcessando(false)
    }
  }

  async function handleExcluir() {
    if (!window.confirm('Excluir esta atividade? A ação não pode ser desfeita.')) return
    setProcessando(true)
    try {
      await deletarTarefa(t.id)
      onAtualizada()
      onFechar()
    } finally {
      setProcessando(false)
    }
  }

  async function abrirAnexo() {
    if (!t.anexo_path) return
    try {
      const url = await urlAssinadaAnexo(t.anexo_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch { /* silent */ }
  }

  // Valor padrão para o campo de adiamento (amanhã, mesma hora)
  function prazoAdiamentoDefault() {
    return format(addDays(dataFim, 1), "yyyy-MM-dd'T'HH:mm")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />

      {/* Painel */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeCor}`}>
                {badgeLabel}
              </span>
              {t.setor_responsavel && (
                <span className="text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                  {LABEL_SETOR[t.setor_responsavel] ?? t.setor_responsavel}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{t.titulo}</h2>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Descrição */}
          {t.descricao && (
            <div className="flex gap-3">
              <FileText size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 whitespace-pre-line">{t.descricao}</p>
            </div>
          )}

          {/* Metadados */}
          <div className="space-y-3">
            {/* Prazo */}
            <MetaLinha
              icone={<Clock size={14} className={vencida ? 'text-red-500' : 'text-gray-400'} />}
              label="Vencimento"
              valor={format(dataFim, "dd 'de' MMMM 'de' yyyy 'às' HH'h'mm", { locale: ptBR })}
              corValor={vencida ? 'text-red-600 font-medium' : hoje ? 'text-amber-600 font-medium' : 'text-gray-700'}
            />

            {/* Criado por */}
            {t.criado_por && (
              <MetaLinha
                icone={<User size={14} className="text-gray-400" />}
                label="Criado por"
                valor={t.criado_por.nome}
              />
            )}

            {/* Criado em */}
            <MetaLinha
              icone={<CalendarClock size={14} className="text-gray-400" />}
              label="Criado em"
              valor={format(parseISO(t.criado_em), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })}
            />

            {/* Responsável */}
            {t.responsavel ? (
              <MetaLinha
                icone={<Users size={14} className="text-gray-400" />}
                label="Responsável"
                valor={t.responsavel.nome}
              />
            ) : (
              <MetaLinha
                icone={<Users size={14} className="text-gray-400" />}
                label="Responsável"
                valor="Não atribuído"
                corValor="text-gray-400 italic"
              />
            )}

            {/* Setor */}
            {t.setor_responsavel && (
              <MetaLinha
                icone={<Building2 size={14} className="text-gray-400" />}
                label="Setor"
                valor={LABEL_SETOR[t.setor_responsavel] ?? t.setor_responsavel}
              />
            )}

            {/* Concluído por */}
            {t.status === 'concluida' && t.concluido_por && (
              <MetaLinha
                icone={<CheckCircle2 size={14} className="text-green-500" />}
                label="Concluído por"
                valor={`${t.concluido_por.nome}${t.concluido_em ? ` · ${format(parseISO(t.concluido_em), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })}` : ''}`}
                corValor="text-green-700"
              />
            )}
          </div>

          {/* Documento anexo */}
          {t.anexo_nome && (
            <div className="border border-dashed border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Documento Anexo</p>
              <button
                onClick={abrirAnexo}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Paperclip size={14} />
                <span className="truncate">{t.anexo_nome}</span>
              </button>
            </div>
          )}

          {/* Adiamento inline */}
          {adiando && t.status === 'aberta' && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-800">Adiar vencimento</p>
              <input
                type="datetime-local"
                defaultValue={prazoAdiamentoDefault()}
                onChange={(e) => setNovoPrazo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              />
              {erroAdiamento && (
                <p className="text-xs text-red-600">{erroAdiamento}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAdiar}
                  disabled={processando}
                  className="flex-1 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-60 transition-colors"
                >
                  {processando ? 'Salvando...' : 'Confirmar Adiamento'}
                </button>
                <button
                  onClick={() => { setAdiando(false); setErroAdiamento('') }}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé — ações */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={onFechar}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              Fechar
            </button>
            {usuario?.perfis.includes('supervisor') && (
              <button
                onClick={handleExcluir}
                disabled={processando}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60 transition-colors"
                title="Excluir atividade"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {t.status === 'aberta' && !adiando && (
              <button
                onClick={() => { setAdiando(true); setNovoPrazo(prazoAdiamentoDefault()) }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-amber-700 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <CalendarClock size={14} />
                Adiar
              </button>
            )}

            {t.status === 'aberta' ? (
              <button
                onClick={handleConcluir}
                disabled={processando}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                <CheckCircle2 size={14} />
                {processando ? 'Concluindo...' : 'Concluir'}
              </button>
            ) : (
              <button
                onClick={handleReabrir}
                disabled={processando}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-60 transition-colors"
              >
                <RotateCcw size={14} />
                {processando ? 'Reabrindo...' : 'Reabrir'}
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

// ── Sub-componente ────────────────────────────────────────────
function MetaLinha({
  icone, label, valor, corValor = 'text-gray-700',
}: {
  icone: React.ReactNode
  label: string
  valor: string
  corValor?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex-shrink-0">{icone}</span>
      <div className="min-w-0">
        <span className="text-xs text-gray-400 block">{label}</span>
        <span className={`text-sm ${corValor}`}>{valor}</span>
      </div>
    </div>
  )
}
