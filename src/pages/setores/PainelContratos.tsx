import { useState, useEffect } from 'react'
import { useRequererPerfil } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { listarAtividadesDoSetor, concluirAtividade, concluirVenda, atualizarDadosAtividade, type AtividadeComVenda } from '@/services/setores'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ModalResumoVenda from '@/components/vendas/ModalResumoVenda'
import FiltrosPainel, { STATUS_ATIVIDADE, type FiltrosPainelState } from '@/components/ui/FiltrosPainel'
import { FileText, CheckCircle2, Eye, History, Trash2, CreditCard } from 'lucide-react'
import type { VendaListagem } from '@/services/vendas'
import SecaoTarefasSetor from '@/components/tarefas/SecaoTarefasSetor'
import { useAuthStore } from '@/store/authStore'
import { excluirAtividadeSetor } from '@/services/supervisor'

export default function PainelContratos() {
  useRequererPerfil(['contratos', 'supervisor'])

  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const isSupervisor = usuario?.perfis.includes('supervisor') ?? false
  const [atividades, setAtividades] = useState<AtividadeComVenda[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaListagem | null>(null)
  const [filtros, setFiltros] = useState<FiltrosPainelState>({ de: '', ate: '', status: '' })

  const pendentes = atividades.filter((a) => a.status === 'pendente')
  const concluidas = atividades.filter((a) => a.status === 'concluida')

  async function carregar() {
    setCarregando(true)
    try {
      const dados = await listarAtividadesDoSetor('contratos', filtros)
      setAtividades(dados)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [filtros])

  async function formalizarContrato(atividade: AtividadeComVenda) {
    setProcessando(atividade.id)
    try {
      await concluirAtividade(atividade.id)
      await concluirVenda(atividade.sale_id)
      await carregar()
    } finally {
      setProcessando(null)
    }
  }

  async function registrarPagamentoSolicitado(atividade: AtividadeComVenda) {
    setProcessando(`pag-${atividade.id}`)
    try {
      await atualizarDadosAtividade(atividade.id, {
        pagamento_solicitado: true,
        pagamento_solicitado_em: new Date().toISOString(),
      })
      await carregar()
    } finally {
      setProcessando(null)
    }
  }

  function temFinanciamento(atividade: AtividadeComVenda): boolean {
    const formas = atividade.sales.formas_pagamento_json
    return Array.isArray(formas) && formas.some((f) => f.tipo === 'financiamento')
  }

  function pagamentoJaSolicitado(atividade: AtividadeComVenda): boolean {
    return atividade.dados_json?.pagamento_solicitado === true
  }

  async function handleExcluir(id: string) {
    try {
      await excluirAtividadeSetor(id)
      await carregar()
    } catch { /* silent */ }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        titulo="Contratos"
        subtitulo={`${pendentes.length} pendente${pendentes.length !== 1 ? 's' : ''} · ${concluidas.length} concluída${concluidas.length !== 1 ? 's' : ''}`}
      />

      <div className="flex-1 p-4 md:p-6 space-y-4">
        <FiltrosPainel
          filtros={filtros}
          onChange={setFiltros}
          opcoesStatus={STATUS_ATIVIDADE}
          totalExibido={atividades.length}
        />

        {carregando && <p className="text-gray-400 text-sm">Carregando...</p>}

        {!carregando && (
          <>
            {/* Pendentes */}
            {pendentes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Aguardando Formalização ({pendentes.length})
                </p>
                <div className="space-y-3">
                  {pendentes.map((a) => (
                    <CartaoSetor key={a.id} atividade={a}
                      onVerResumo={() => setVendaSelecionada(a.sales)}
                      onVerHistorico={() => navigate(`/venda/${a.sale_id}`)}
                      onGerarContrato={() => navigate(`/venda/${a.sale_id}?contrato=1`)}
                      onExcluir={isSupervisor ? () => handleExcluir(a.id) : undefined}
                    >
                      <div className="flex flex-col gap-1.5 items-end">
                        {temFinanciamento(a) && (
                          pagamentoJaSolicitado(a) ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                              <CreditCard size={11} />
                              Pagamento Solicitado
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-purple-300 text-purple-700 hover:bg-purple-50"
                              onClick={() => registrarPagamentoSolicitado(a)}
                              disabled={processando === `pag-${a.id}`}
                            >
                              <CreditCard size={13} className="mr-1.5" />
                              {processando === `pag-${a.id}` ? 'Registrando...' : 'Pagamento Solicitado'}
                            </Button>
                          )
                        )}
                        <Button size="sm" onClick={() => formalizarContrato(a)} disabled={processando === a.id}>
                          <FileText size={13} className="mr-1.5" />
                          {processando === a.id ? 'Processando...' : 'Formalizar Contrato'}
                        </Button>
                      </div>
                    </CartaoSetor>
                  ))}
                </div>
              </div>
            )}

            {/* Concluídas */}
            {concluidas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Contratos Formalizados ({concluidas.length})
                </p>
                <div className="space-y-3">
                  {concluidas.map((a) => (
                    <CartaoSetor key={a.id} atividade={a}
                      onVerResumo={() => setVendaSelecionada(a.sales)}
                      onVerHistorico={() => navigate(`/venda/${a.sale_id}`)}
                      onGerarContrato={() => navigate(`/venda/${a.sale_id}?contrato=1`)}
                      onExcluir={isSupervisor ? () => handleExcluir(a.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {atividades.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <CheckCircle2 size={40} className="text-green-300 mb-3" />
                <p className="text-gray-500 font-medium">Nenhum processo registrado</p>
              </div>
            )}
          </>
        )}

        {/* Atividades do setor */}
        <SecaoTarefasSetor setor="contratos" />
      </div>

      <ModalResumoVenda venda={vendaSelecionada} onFechar={() => setVendaSelecionada(null)} />
    </div>
  )
}

// ============================================================
// Componente compartilhado entre painéis — renderiza os dados da venda
export function CartaoSetor({
  atividade,
  children,
  extra,
  onVerResumo,
  onVerHistorico,
  onGerarContrato,
  onExcluir,
}: {
  atividade: AtividadeComVenda
  children?: React.ReactNode
  extra?: React.ReactNode
  onVerResumo?: () => void
  onVerHistorico?: () => void
  onGerarContrato?: () => void
  onExcluir?: () => void
}) {
  const v = atividade.sales
  const concluida = atividade.status === 'concluida'

  return (
    <div className={`bg-white border rounded-xl p-4 transition-colors ${
      concluida ? 'border-gray-100 opacity-80' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${concluida ? 'text-gray-500' : 'text-gray-900'}`}>
              {v.marca} {v.modelo} {v.ano_modelo}
            </p>
            <span className="text-gray-400 text-xs">·</span>
            <span className="text-xs text-gray-500 font-mono uppercase">{v.placa}</span>
            {v.unidade && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                v.unidade === 'fd_motos'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {v.unidade === 'fd_motos' ? 'FD Motos' : 'FD Veículos'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{v.comprador_nome}</p>
          <p className="text-xs text-gray-400 mt-1">
            {Number(v.valor_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            {' · '}
            {new Date(atividade.criado_em).toLocaleDateString('pt-BR')}
          </p>
          {v.users?.nome && (
            <p className="text-xs text-blue-600 mt-0.5 font-medium">Vendedor: {v.users.nome}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {concluida ? (
              <Badge className="text-xs bg-green-100 text-green-700 border-0 rounded-full">
                <CheckCircle2 size={10} className="mr-1" />
                Concluído
              </Badge>
            ) : (
              <Badge className="text-xs bg-amber-100 text-amber-700 border-0 rounded-full">
                Aguardando
              </Badge>
            )}
            {onExcluir && (
              <button
                onClick={() => window.confirm('Excluir esta atividade? A ação não pode ser desfeita.') && onExcluir()}
                className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                title="Excluir"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {onVerHistorico && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onVerHistorico}>
                <History size={12} className="mr-1" />
                Histórico
              </Button>
            )}
            {onVerResumo && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onVerResumo}>
                <Eye size={12} className="mr-1" />
                Resumo
              </Button>
            )}
            {onGerarContrato && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-blue-700 border-blue-200 hover:bg-blue-50" onClick={onGerarContrato}>
                <FileText size={12} className="mr-1" />
                Contrato
              </Button>
            )}
          </div>
          {children}
        </div>
      </div>
      {extra}
    </div>
  )
}
