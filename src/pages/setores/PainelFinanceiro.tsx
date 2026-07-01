import { useState, useEffect } from 'react'
import { useRequererPerfil } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { listarAtividadesDoSetor, concluirAtividade, type AtividadeComVenda } from '@/services/setores'
import {
  listarPendenciasFinanceiras,
  registrarPendenciaFinanceira,
  encerrarPendenciaFinanceira,
  atualizarConfirmacoesFinanceiro,
} from '@/services/financeiro'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { CartaoSetor } from './PainelContratos'
import { Badge } from '@/components/ui/badge'
import ModalResumoVenda from '@/components/vendas/ModalResumoVenda'
import FiltrosPainel, { STATUS_ATIVIDADE, type FiltrosPainelState } from '@/components/ui/FiltrosPainel'
import { Check, CheckCircle2, PlusCircle, X } from 'lucide-react'
import type { MetodoPagamentoItem, PendenciaFinanceira } from '@/types'
import type { VendaListagem } from '@/services/vendas'
import SecaoTarefasSetor from '@/components/tarefas/SecaoTarefasSetor'
import { excluirAtividadeSetor } from '@/services/supervisor'

const LABEL_METODO: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao: 'Cartão',
  financiamento: 'Financiamento',
  promissoria: 'Promissória',
}

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(data?: string): string | null {
  if (!data) return null
  const [a, m, d] = data.split('-')
  return `${d}/${m}/${a}`
}

function getMetodos(a: AtividadeComVenda): MetodoPagamentoItem[] {
  return (a.sales as VendaListagem).formas_pagamento_json ?? []
}

export default function PainelFinanceiro() {
  useRequererPerfil(['financeiro', 'supervisor'])

  const { usuario } = useAuthStore()
  const isSupervisor = usuario?.perfis.includes('supervisor') ?? false
  const navigate = useNavigate()
  const [atividades, setAtividades] = useState<AtividadeComVenda[]>([])
  const [filtros, setFiltros] = useState<FiltrosPainelState>({ de: '', ate: '', status: '' })
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)
  const [pendenciasPorVenda, setPendenciasPorVenda] = useState<Record<string, PendenciaFinanceira[]>>({})
  const [descricaoPendencia, setDescricaoPendencia] = useState<Record<string, string>>({})
  const [adicionandoPendencia, setAdicionandoPendencia] = useState<string | null>(null)
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaListagem | null>(null)
  const [confirmacoesPorAtividade, setConfirmacoesPorAtividade] = useState<Record<string, boolean[]>>({})

  // Inicializa estado de confirmações a partir do dados_json salvo no banco
  useEffect(() => {
    const mapa: Record<string, boolean[]> = {}
    atividades.forEach((a) => {
      const metodos = getMetodos(a)
      if (metodos.length > 0) {
        const salvas = a.dados_json?.confirmacoes as boolean[] | undefined
        mapa[a.id] = salvas?.length === metodos.length ? salvas : Array(metodos.length).fill(false)
      }
    })
    setConfirmacoesPorAtividade(mapa)
  }, [atividades])

  async function carregar() {
    setCarregando(true)
    try {
      const dados = await listarAtividadesDoSetor('financeiro', filtros)
      setAtividades(dados)
      const mapa: Record<string, PendenciaFinanceira[]> = {}
      await Promise.all(
        dados.map(async (a) => {
          mapa[a.sale_id] = await listarPendenciasFinanceiras(a.sale_id)
        })
      )
      setPendenciasPorVenda(mapa)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [filtros])

  async function toggleConfirmacao(atividadeId: string, index: number) {
    const atual = confirmacoesPorAtividade[atividadeId] ?? []
    const novas = [...atual]
    novas[index] = !novas[index]
    // Atualiza estado local imediatamente para feedback visual instantâneo
    setConfirmacoesPorAtividade((prev) => ({ ...prev, [atividadeId]: novas }))
    try {
      await atualizarConfirmacoesFinanceiro(atividadeId, novas)
    } catch {
      // Reverte se falhar
      setConfirmacoesPorAtividade((prev) => ({ ...prev, [atividadeId]: atual }))
    }
  }

  function podeConcluir(atividadeId: string, metodos: MetodoPagamentoItem[]): boolean {
    if (metodos.length === 0) return true
    const confs = confirmacoesPorAtividade[atividadeId] ?? []
    return confs.length === metodos.length && confs.every(Boolean)
  }

  async function concluirFinanceiro(atividade: AtividadeComVenda) {
    setProcessando(atividade.id)
    try {
      await concluirAtividade(atividade.id, {
        confirmacoes: confirmacoesPorAtividade[atividade.id] ?? [],
      })
      await carregar()
    } finally {
      setProcessando(null)
    }
  }

  async function adicionarPendencia(saleId: string) {
    const desc = descricaoPendencia[saleId]?.trim()
    if (!desc || !usuario?.id) return
    setProcessando(`pend-${saleId}`)
    try {
      await registrarPendenciaFinanceira(saleId, desc, usuario.id)
      setDescricaoPendencia((prev) => ({ ...prev, [saleId]: '' }))
      setAdicionandoPendencia(null)
      await carregar()
    } finally {
      setProcessando(null)
    }
  }

  async function encerrarPendencia(pendenciaId: string) {
    if (!usuario?.id) return
    try {
      await encerrarPendenciaFinanceira(pendenciaId, usuario.id)
      await carregar()
    } catch { /* silent */ }
  }

  async function handleExcluir(id: string) {
    try {
      await excluirAtividadeSetor(id)
      await carregar()
    } catch { /* silent */ }
  }

  const pendentes  = atividades.filter((a) => a.status === 'pendente')
  const concluidas = atividades.filter((a) => a.status === 'concluida')

  return (
    <div className="flex flex-col flex-1">
      <Header
        titulo="Financeiro"
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
                  Aguardando Confirmação ({pendentes.length})
                </p>
                <div className="space-y-3">
                  {pendentes.map((a) => {
                    const pendencias       = pendenciasPorVenda[a.sale_id] ?? []
                    const pendenciasAbertas = pendencias.filter((p) => p.status === 'aberta')
                    const metodos          = getMetodos(a)
                    const confirmacoes     = confirmacoesPorAtividade[a.id] ?? []
                    const totalConf        = confirmacoes.filter(Boolean).length
                    const todoConf         = podeConcluir(a.id, metodos)

                    return (
                      <CartaoSetor
                        key={a.id}
                        atividade={a}
                        onVerResumo={() => setVendaSelecionada(a.sales)}
                        onVerHistorico={() => navigate(`/venda/${a.sale_id}`)}
                        onGerarContrato={() => navigate(`/venda/${a.sale_id}?contrato=1`)}
                        onExcluir={isSupervisor ? () => handleExcluir(a.id) : undefined}
                        extra={
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">

                            {/* ── Confirmação por método de pagamento ── */}
                            {metodos.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Confirmar recebimentos
                                  </p>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    todoConf
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {totalConf}/{metodos.length} confirmado{totalConf !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  {metodos.map((m, i) => {
                                    const confirmado = confirmacoes[i] ?? false
                                    return (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => toggleConfirmacao(a.id, i)}
                                        className={`w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all ${
                                          confirmado
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
                                        }`}
                                      >
                                        {/* Checkbox visual */}
                                        <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                          confirmado
                                            ? 'bg-green-600 border-green-600'
                                            : 'border-gray-300 bg-white'
                                        }`}>
                                          {confirmado && <Check size={11} className="text-white" />}
                                        </div>

                                        {/* Detalhes do método */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className={`text-sm font-medium ${confirmado ? 'text-green-700' : 'text-gray-800'}`}>
                                              {LABEL_METODO[m.tipo] ?? m.tipo}
                                            </span>
                                            <span className={`text-sm font-semibold tabular-nums ${confirmado ? 'text-green-700' : 'text-gray-700'}`}>
                                              {formatarMoeda(m.valor)}
                                            </span>
                                          </div>
                                          {/* Banco / financeira */}
                                          {m.banco && (
                                            <p className="text-xs text-gray-500 mt-0.5">{m.banco}</p>
                                          )}
                                          {/* Parcelas */}
                                          {m.numero_parcelas && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              {m.numero_parcelas}x
                                              {m.valor_parcela
                                                ? ` de ${formatarMoeda(m.valor_parcela)}`
                                                : ''}
                                              {m.data_primeiro_pagamento
                                                ? ` · 1ª em ${formatarData(m.data_primeiro_pagamento)}`
                                                : ''}
                                            </p>
                                          )}
                                          {/* Data prevista do pagamento (quando informada) */}
                                          {m.data && !m.numero_parcelas && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              Previsto: {formatarData(m.data)}
                                            </p>
                                          )}
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* ── Pendências financeiras ── */}
                            {pendenciasAbertas.map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge className="text-xs bg-red-100 text-red-700 border-0 rounded-full">
                                    Pendência
                                  </Badge>
                                  <span className="text-gray-700">{p.descricao}</span>
                                </div>
                                <button
                                  onClick={() => encerrarPendencia(p.id)}
                                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                                >
                                  <X size={12} />
                                  Encerrar
                                </button>
                              </div>
                            ))}

                            {/* ── Adicionar pendência ── */}
                            {adicionandoPendencia === a.sale_id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Descreva a pendência..."
                                  className="h-8 text-xs"
                                  value={descricaoPendencia[a.sale_id] ?? ''}
                                  onChange={(e) =>
                                    setDescricaoPendencia((prev) => ({ ...prev, [a.sale_id]: e.target.value }))
                                  }
                                  onKeyDown={(e) => e.key === 'Enter' && adicionarPendencia(a.sale_id)}
                                />
                                <Button
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => adicionarPendencia(a.sale_id)}
                                  disabled={processando === `pend-${a.sale_id}`}
                                >
                                  OK
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs"
                                  onClick={() => setAdicionandoPendencia(null)}
                                >
                                  <X size={12} />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAdicionandoPendencia(a.sale_id)}
                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <PlusCircle size={12} />
                                Registrar pendência
                              </button>
                            )}
                          </div>
                        }
                      >
                        {/* ── Botão concluir ── */}
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => concluirFinanceiro(a)}
                            disabled={processando === a.id || (!todoConf && metodos.length > 0)}
                          >
                            <CheckCircle2 size={13} className="mr-1.5" />
                            {processando === a.id ? 'Processando...' : 'Concluir Financeiro'}
                          </Button>
                          {!todoConf && metodos.length > 0 && (
                            <p className="text-xs text-amber-600">
                              Confirme todos os recebimentos acima
                            </p>
                          )}
                        </div>
                      </CartaoSetor>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Concluídas */}
            {concluidas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Pagamentos Confirmados ({concluidas.length})
                </p>
                <div className="space-y-3">
                  {concluidas.map((a) => (
                    <CartaoSetor
                      key={a.id}
                      atividade={a}
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

        <SecaoTarefasSetor setor="financeiro" />
      </div>

      <ModalResumoVenda venda={vendaSelecionada} onFechar={() => setVendaSelecionada(null)} />
    </div>
  )
}
