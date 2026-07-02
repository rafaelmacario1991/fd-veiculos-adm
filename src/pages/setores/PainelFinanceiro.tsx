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
import { buscarEntradasVeiculo, type EntradaVeiculo } from '@/services/entradaVeiculo'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { CartaoSetor } from './PainelContratos'
import { Badge } from '@/components/ui/badge'
import ModalResumoVenda from '@/components/vendas/ModalResumoVenda'
import FiltrosPainel, { STATUS_ATIVIDADE, type FiltrosPainelState } from '@/components/ui/FiltrosPainel'
import { Check, CheckCircle2, PlusCircle, X, AlertTriangle, ArrowDownLeft } from 'lucide-react'
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

// ── Item financeiro unificado ─────────────────────────────────
interface ItemFinanceiro {
  chave: string
  tipo: 'pagamento' | 'entrada' | 'troco'
  label: string
  valor: number        // positivo = recebimento, negativo = saída (troco)
  detalhe?: string
}

function buildItens(a: AtividadeComVenda, entradas: EntradaVeiculo[]): ItemFinanceiro[] {
  const venda = a.sales as VendaListagem
  const itens: ItemFinanceiro[] = []

  // ── Métodos de pagamento ──
  getMetodos(a).forEach((m, i) => {
    const partes: string[] = []
    if (m.banco) partes.push(m.banco)
    if (m.numero_parcelas) {
      partes.push(
        `${m.numero_parcelas}×${m.valor_parcela ? ` de ${formatarMoeda(m.valor_parcela)}` : ''}${
          m.data_primeiro_pagamento ? ` · 1ª em ${formatarData(m.data_primeiro_pagamento)}` : ''
        }`
      )
    }
    if (m.data && !m.numero_parcelas) partes.push(`Previsto: ${formatarData(m.data)}`)

    itens.push({
      chave: `p_${i}`,
      tipo: 'pagamento',
      label: LABEL_METODO[m.tipo] ?? m.tipo,
      valor: m.valor,
      detalhe: partes.join(' · ') || undefined,
    })
  })

  // ── Veículos de entrada ──
  entradas.forEach((e, i) => {
    const debitos = e.debitos ?? []
    const totalDebitos = debitos.reduce((s, d) => s + d.valor, 0)
    const valorLiquido = (e.valor_estimado ?? 0) - totalDebitos

    const partes: string[] = []
    if (e.marca || e.modelo) partes.push(`${e.marca ?? ''} ${e.modelo ?? ''}`.trim())
    if (e.placa) partes.push(e.placa.toUpperCase())
    if (totalDebitos > 0) partes.push(`Débitos: -${formatarMoeda(totalDebitos)}`)

    itens.push({
      chave: `e_${i}`,
      tipo: 'entrada',
      label: entradas.length > 1 ? `Veículo de Entrada ${i + 1}` : 'Veículo de Entrada',
      valor: valorLiquido,
      detalhe: partes.join(' · ') || undefined,
    })
  })

  // ── Troco ──
  const troco = (venda as unknown as { troco?: number }).troco ?? 0
  if (troco > 0) {
    itens.push({
      chave: 'troco',
      tipo: 'troco',
      label: 'Troco ao cliente',
      valor: -troco,
    })
  }

  return itens
}

// Lê confirmações salvas (suporta formato antigo boolean[] e novo Record<string,boolean>)
function lerConfirmacoes(
  dadosJson: Record<string, unknown> | null | undefined,
  itens: ItemFinanceiro[],
  metodos: MetodoPagamentoItem[]
): Record<string, boolean> {
  const mapa: Record<string, boolean> = {}
  itens.forEach((item) => { mapa[item.chave] = false })

  const salvas = dadosJson?.confirmacoes
  if (Array.isArray(salvas)) {
    // formato antigo — só os métodos de pagamento
    metodos.forEach((_, i) => { if (salvas[i] != null) mapa[`p_${i}`] = salvas[i] as boolean })
  } else if (salvas && typeof salvas === 'object') {
    const rec = salvas as Record<string, boolean>
    itens.forEach((item) => { if (rec[item.chave] != null) mapa[item.chave] = rec[item.chave] })
  }

  return mapa
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
  const [entradasPorVenda, setEntradasPorVenda] = useState<Record<string, EntradaVeiculo[]>>({})
  const [descricaoPendencia, setDescricaoPendencia] = useState<Record<string, string>>({})
  const [adicionandoPendencia, setAdicionandoPendencia] = useState<string | null>(null)
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaListagem | null>(null)
  const [confirmacoesPorAtividade, setConfirmacoesPorAtividade] = useState<Record<string, Record<string, boolean>>>({})

  async function carregar() {
    setCarregando(true)
    try {
      const dados = await listarAtividadesDoSetor('financeiro', filtros)
      setAtividades(dados)

      const mapaPendencias: Record<string, PendenciaFinanceira[]> = {}
      const mapaEntradas: Record<string, EntradaVeiculo[]> = {}

      await Promise.all(
        dados.map(async (a) => {
          const [pends, entradas] = await Promise.all([
            listarPendenciasFinanceiras(a.sale_id),
            buscarEntradasVeiculo(a.sale_id),
          ])
          mapaPendencias[a.sale_id] = pends
          mapaEntradas[a.sale_id] = entradas
        })
      )

      setPendenciasPorVenda(mapaPendencias)
      setEntradasPorVenda(mapaEntradas)

      // Inicializa mapa de confirmações com suporte ao formato antigo
      const mapaConf: Record<string, Record<string, boolean>> = {}
      dados.forEach((a) => {
        const itens = buildItens(a, mapaEntradas[a.sale_id] ?? [])
        mapaConf[a.id] = lerConfirmacoes(
          a.dados_json as Record<string, unknown> | null,
          itens,
          getMetodos(a)
        )
      })
      setConfirmacoesPorAtividade(mapaConf)

    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [filtros])

  async function toggleConfirmacao(atividadeId: string, chave: string) {
    const atual = confirmacoesPorAtividade[atividadeId] ?? {}
    const novas = { ...atual, [chave]: !atual[chave] }
    setConfirmacoesPorAtividade((prev) => ({ ...prev, [atividadeId]: novas }))
    try {
      await atualizarConfirmacoesFinanceiro(atividadeId, novas)
    } catch {
      setConfirmacoesPorAtividade((prev) => ({ ...prev, [atividadeId]: atual }))
    }
  }

  function podeConcluir(atividadeId: string, itens: ItemFinanceiro[]): boolean {
    if (itens.length === 0) return true
    const confs = confirmacoesPorAtividade[atividadeId] ?? {}
    return itens.every((item) => confs[item.chave] === true)
  }

  async function concluirFinanceiro(atividade: AtividadeComVenda) {
    setProcessando(atividade.id)
    try {
      await concluirAtividade(atividade.id, {
        confirmacoes: confirmacoesPorAtividade[atividade.id] ?? {},
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
                    const pendencias        = pendenciasPorVenda[a.sale_id] ?? []
                    const pendenciasAbertas = pendencias.filter((p) => p.status === 'aberta')
                    const entradas          = entradasPorVenda[a.sale_id] ?? []
                    const itens             = buildItens(a, entradas)
                    const confirmacoes      = confirmacoesPorAtividade[a.id] ?? {}
                    const totalConf         = itens.filter((i) => confirmacoes[i.chave]).length
                    const todoConf          = podeConcluir(a.id, itens)
                    const venda             = a.sales as VendaListagem
                    const totalItens        = itens.reduce((s, i) => s + i.valor, 0)
                    const confere           = Math.abs(totalItens - venda.valor_venda) < 0.01

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

                            {/* ── Itens da negociação ── */}
                            {itens.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Conferir negociação
                                  </p>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    todoConf
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {totalConf}/{itens.length} confirmado{totalConf !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  {itens.map((item) => {
                                    const confirmado = confirmacoes[item.chave] ?? false
                                    const isNegativo = item.valor < 0

                                    return (
                                      <button
                                        key={item.chave}
                                        type="button"
                                        onClick={() => toggleConfirmacao(a.id, item.chave)}
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

                                        {/* Ícone do tipo */}
                                        {item.tipo === 'entrada' && (
                                          <ArrowDownLeft size={14} className={`mt-0.5 flex-shrink-0 ${confirmado ? 'text-green-600' : 'text-indigo-400'}`} />
                                        )}

                                        {/* Detalhes */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className={`text-sm font-medium ${confirmado ? 'text-green-700' : 'text-gray-800'}`}>
                                                {item.label}
                                              </span>
                                              {item.tipo === 'entrada' && (
                                                <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">
                                                  Entrada
                                                </span>
                                              )}
                                              {item.tipo === 'troco' && (
                                                <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100">
                                                  Troco
                                                </span>
                                              )}
                                            </div>
                                            <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                                              confirmado
                                                ? 'text-green-700'
                                                : isNegativo
                                                  ? 'text-orange-600'
                                                  : 'text-gray-700'
                                            }`}>
                                              {isNegativo ? '-' : '+'}{formatarMoeda(Math.abs(item.valor))}
                                            </span>
                                          </div>
                                          {item.detalhe && (
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{item.detalhe}</p>
                                          )}
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>

                                {/* ── Resumo totalizador ── */}
                                <div className={`mt-2 rounded-lg px-3 py-2 flex items-center justify-between gap-2 ${
                                  confere ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                                }`}>
                                  <div className="text-xs text-gray-600 space-y-0.5">
                                    <p>
                                      <span className="font-medium">Total conferido:</span>
                                      {' '}{formatarMoeda(totalItens)}
                                    </p>
                                    <p>
                                      <span className="font-medium">Valor da venda:</span>
                                      {' '}{formatarMoeda(venda.valor_venda)}
                                    </p>
                                  </div>
                                  {confere ? (
                                    <div className="flex items-center gap-1 text-green-700">
                                      <CheckCircle2 size={15} />
                                      <span className="text-xs font-semibold">Confere</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-amber-700">
                                      <AlertTriangle size={14} />
                                      <span className="text-xs font-semibold">
                                        Dif. {formatarMoeda(Math.abs(totalItens - venda.valor_venda))}
                                      </span>
                                    </div>
                                  )}
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
                            disabled={processando === a.id || (!todoConf && itens.length > 0)}
                          >
                            <CheckCircle2 size={13} className="mr-1.5" />
                            {processando === a.id ? 'Processando...' : 'Concluir Financeiro'}
                          </Button>
                          {!todoConf && itens.length > 0 && (
                            <p className="text-xs text-amber-600 text-right">
                              Confirme todos os itens acima
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
