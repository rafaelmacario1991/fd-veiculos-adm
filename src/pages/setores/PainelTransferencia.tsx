import { useState, useEffect } from 'react'
import { useRequererPerfil } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { listarAtividadesDoSetor, concluirAtividadePorVenda, type AtividadeComVenda } from '@/services/setores'
import {
  listarDespachantes,
  criarTransferencia,
  listarTransferencias,
  atualizarStatusTransferencia,
  registrarPendenciaTransferencia,
  listarPendenciasTransferencia,
  encerrarPendenciaTransferencia,
  type ProcessoComDespachante,
  type PendenciaTransferencia,
} from '@/services/transferencias'
import { excluirAtividadeSetor, excluirTransferencia } from '@/services/supervisor'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNavigate } from 'react-router-dom'
import { CartaoSetor } from './PainelContratos'
import ModalResumoVenda from '@/components/vendas/ModalResumoVenda'
import FiltrosPainel, { STATUS_TRANSFERENCIA, type FiltrosPainelState } from '@/components/ui/FiltrosPainel'
import { Truck, CheckCircle2, AlertTriangle, Clock, History, Trash2, XCircle } from 'lucide-react'
import type { Despachante } from '@/types'
import type { VendaListagem } from '@/services/vendas'
import SecaoTarefasSetor from '@/components/tarefas/SecaoTarefasSetor'
import { statusPrazo30dias, diasRestantes, corPorStatusPrazo, formatarDataCurta } from '@/lib/prazos'

export default function PainelTransferencia() {
  useRequererPerfil(['transferencia', 'supervisor'])

  const { usuario } = useAuthStore()
  const isSupervisor = usuario?.perfis.includes('supervisor') ?? false
  const [pendentes, setPendentes] = useState<AtividadeComVenda[]>([])
  const [processos, setProcessos] = useState<ProcessoComDespachante[]>([])
  const [despachantes, setDespachantes] = useState<Despachante[]>([])
  const [carregando, setCarregando] = useState(true)

  // Dialog — enviar ao despachante
  const [atividadeEnviando, setAtividadeEnviando] = useState<AtividadeComVenda | null>(null)
  const [despachanteId, setDespachanteId] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Pendências de transferência (antes do envio ao despachante)
  const [pendenciasMap, setPendenciasMap] = useState<Map<string, PendenciaTransferencia[]>>(new Map())
  const [atividadeComPendencia, setAtividadeComPendencia] = useState<AtividadeComVenda | null>(null)
  const [descNovaPendencia, setDescNovaPendencia] = useState('')
  const [salvandoPendencia, setSalvandoPendencia] = useState(false)

  const navigate = useNavigate()
  const [filtros, setFiltros] = useState<FiltrosPainelState>({ de: '', ate: '', status: '', unidade: '' })

  // Modal resumo de venda
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaListagem | null>(null)

  // Dialog — atualizar status
  const [processoEditando, setProcessoEditando] = useState<ProcessoComDespachante | null>(null)
  const [descPendencia, setDescPendencia] = useState('')
  const [atualizando, setAtualizando] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      const filtrosComum = { de: filtros.de, ate: filtros.ate }
      const [pend, proc, desp] = await Promise.all([
        listarAtividadesDoSetor('transferencia', filtrosComum),
        listarTransferencias({ ...filtrosComum, status: filtros.status }),
        listarDespachantes(),
      ])
      setPendentes(pend)
      setProcessos(proc)
      setDespachantes(desp)

      const saleIds = pend.map((a) => a.sale_id)
      const pendenciasLista = await listarPendenciasTransferencia(saleIds)
      const mapa = new Map<string, PendenciaTransferencia[]>()
      for (const p of pendenciasLista) {
        const lista = mapa.get(p.sale_id) ?? []
        lista.push(p)
        mapa.set(p.sale_id, lista)
      }
      setPendenciasMap(mapa)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [filtros])

  async function enviarAoDespachante() {
    if (!atividadeEnviando || !despachanteId) return
    setEnviando(true)
    try {
      await criarTransferencia(atividadeEnviando.sale_id, despachanteId)
      // NÃO conclui a atividade aqui — só conclui quando o processo de transferência
      // for de fato concluído
      setAtividadeEnviando(null)
      setDespachanteId('')
      await carregar()
    } finally {
      setEnviando(false)
    }
  }

  async function marcarConcluido(processo: ProcessoComDespachante) {
    setAtualizando(true)
    try {
      await atualizarStatusTransferencia(processo.id, 'concluido')
      // Agora sim: conclui a atividade do setor transferência
      await concluirAtividadePorVenda(processo.sale_id, 'transferencia')
      await carregar()
    } finally {
      setAtualizando(false)
    }
  }

  async function handleExcluirAtividade(id: string) {
    try {
      await excluirAtividadeSetor(id)
      await carregar()
    } catch { /* silent */ }
  }

  async function handleExcluirProcesso(id: string) {
    try {
      await excluirTransferencia(id)
      await carregar()
    } catch { /* silent */ }
  }

  async function salvarPendencia() {
    if (!processoEditando) return
    setAtualizando(true)
    try {
      await atualizarStatusTransferencia(processoEditando.id, 'pendencia', descPendencia)
      setProcessoEditando(null)
      setDescPendencia('')
      await carregar()
    } finally {
      setAtualizando(false)
    }
  }

  async function salvarPendenciaAtividade() {
    if (!atividadeComPendencia || !descNovaPendencia.trim() || !usuario?.id) return
    setSalvandoPendencia(true)
    try {
      await registrarPendenciaTransferencia(atividadeComPendencia.sale_id, descNovaPendencia.trim(), usuario.id)
      setAtividadeComPendencia(null)
      setDescNovaPendencia('')
      await carregar()
    } finally {
      setSalvandoPendencia(false)
    }
  }

  async function encerrarPendencia(pendenciaId: string) {
    if (!usuario?.id) return
    try {
      await encerrarPendenciaTransferencia(pendenciaId, usuario.id)
      await carregar()
    } catch { /* silent */ }
  }

  // Filtra por unidade client-side
  const unidade = filtros.unidade ?? ''
  const pendentesFiltrados = unidade
    ? pendentes.filter((a) => a.sales.unidade === unidade)
    : pendentes
  const processosFiltrados = unidade
    ? processos.filter((p) => (p as unknown as { sales: { unidade: string } }).sales?.unidade === unidade)
    : processos

  // Todas as atividades sem processo criado ainda
  const saleIdsComProcessoTotal = new Set(processos.map((p) => p.sale_id))
  const aguardandoEnvioTotal = pendentesFiltrados.filter((a) => !saleIdsComProcessoTotal.has(a.sale_id))

  // Decide o que mostrar em "Aguardando Envio" conforme o filtro de status
  const aguardandoExibir =
    filtros.status === 'pendencia'
      ? aguardandoEnvioTotal.filter((a) => (pendenciasMap.get(a.sale_id) ?? []).length > 0)
      : filtros.status
      ? [] // outro filtro de status: ocultar seção
      : aguardandoEnvioTotal // sem filtro: mostrar todos

  const processosAtivos = processosFiltrados.filter((p) => p.status !== 'concluido')
  const processosConcluidos = processosFiltrados.filter((p) => p.status === 'concluido')

  return (
    <div className="flex flex-col flex-1">
      <Header titulo="Transferência" />

      <div className="flex-1 p-4 md:p-6 space-y-4">
        <FiltrosPainel
          filtros={filtros}
          onChange={setFiltros}
          opcoesStatus={STATUS_TRANSFERENCIA}
          mostrarFiltroUnidade
          totalExibido={processosFiltrados.length + aguardandoExibir.length}
        />

        {carregando && <p className="text-gray-400 text-sm">Carregando...</p>}

        {!carregando && (
          <>
            {/* Aguardando envio ao despachante */}
            {aguardandoExibir.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Aguardando Envio ao Despachante ({aguardandoExibir.length})
                </p>
                <div className="space-y-3">
                  {aguardandoExibir.map((a) => {
                    const pendenciasCard = pendenciasMap.get(a.sale_id) ?? []
                    return (
                      <CartaoSetor key={a.id} atividade={a}
                        onVerResumo={() => setVendaSelecionada(a.sales)}
                        onVerHistorico={() => navigate(`/venda/${a.sale_id}`)}
                        onGerarContrato={() => navigate(`/venda/${a.sale_id}?contrato=1`)}
                        onExcluir={isSupervisor ? () => handleExcluirAtividade(a.id) : undefined}>
                        {/* Pendências registradas */}
                        {pendenciasCard.length > 0 && (
                          <div className="mt-2 space-y-1 w-full">
                            {pendenciasCard.map((p) => (
                              <div key={p.id} className="flex items-start justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-amber-800 break-words">{p.descricao}</p>
                                </div>
                                <button
                                  onClick={() => encerrarPendencia(p.id)}
                                  title="Encerrar pendência"
                                  className="text-amber-400 hover:text-red-500 transition-colors flex-shrink-0"
                                >
                                  <XCircle size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => { setAtividadeComPendencia(a); setDescNovaPendencia('') }}>
                            <AlertTriangle size={11} className="mr-1" />
                            Pendência
                          </Button>
                          <Button size="sm" onClick={() => setAtividadeEnviando(a)}>
                            <Truck size={13} className="mr-1.5" />
                            Enviar ao Despachante
                          </Button>
                        </div>
                      </CartaoSetor>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Processos em andamento */}
            {processosAtivos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Processos em Andamento ({processosAtivos.length})
                </p>
                <div className="space-y-3">
                  {processosAtivos.map((p) => {
                    const statusPrazo = statusPrazo30dias(p.prazo)
                    const dias = diasRestantes(p.prazo)
                    return (
                      <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 text-sm">
                                {(p as unknown as { sales: { marca: string; modelo: string; placa: string } }).sales?.marca}{' '}
                                {(p as unknown as { sales: { marca: string; modelo: string; placa: string } }).sales?.modelo}
                              </p>
                              <span className="text-xs text-gray-500 font-mono uppercase">
                                {(p as unknown as { sales: { marca: string; modelo: string; placa: string } }).sales?.placa}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Despachante: <span className="font-medium">{p.dispatchers?.nome}</span>
                            </p>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${corPorStatusPrazo(statusPrazo)}`}>
                              <Clock size={11} />
                              {statusPrazo === 'vencido'
                                ? 'Prazo vencido'
                                : `${dias} dias restantes — prazo ${formatarDataCurta(p.prazo)}`}
                            </div>
                            {p.descricao_pendencia && (
                              <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-2">
                                Pendência: {p.descricao_pendencia}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                              <BadgeTransferencia status={p.status} />
                              {isSupervisor && (
                                <button
                                  onClick={() => window.confirm('Excluir este processo de transferência? A ação não pode ser desfeita.') && handleExcluirProcesso(p.id)}
                                  className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                                  title="Excluir"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => navigate(`/venda/${p.sale_id}`)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              <History size={11} />
                              Histórico
                            </button>
                            {p.status !== 'concluido' && (
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => { setProcessoEditando(p); setDescPendencia('') }}
                                >
                                  <AlertTriangle size={11} className="mr-1" />
                                  Pendência
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => marcarConcluido(p)}
                                  disabled={atualizando}
                                >
                                  <CheckCircle2 size={11} className="mr-1" />
                                  Concluído
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Processos concluídos */}
            {processosConcluidos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Concluídos ({processosConcluidos.length})
                </p>
                <div className="space-y-3">
                  {processosConcluidos.map((p) => (
                    <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 opacity-75">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-600 text-sm">
                            {(p as unknown as { sales: { marca: string; modelo: string; placa: string } }).sales?.marca}{' '}
                            {(p as unknown as { sales: { marca: string; modelo: string; placa: string } }).sales?.modelo}
                            <span className="text-xs text-gray-400 font-mono uppercase ml-2">
                              {(p as unknown as { sales: { marca: string; modelo: string; placa: string } }).sales?.placa}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Despachante: {p.dispatchers?.nome}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <BadgeTransferencia status={p.status} />
                            {isSupervisor && (
                              <button
                                onClick={() => window.confirm('Excluir este processo de transferência? A ação não pode ser desfeita.') && handleExcluirProcesso(p.id)}
                                className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                                title="Excluir"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => navigate(`/venda/${p.sale_id}`)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <History size={11} />
                            Histórico
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aguardandoExibir.length === 0 && processosAtivos.length === 0 && processosConcluidos.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Truck size={40} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Nenhum processo ativo</p>
              </div>
            )}
          </>
        )}

        {/* Atividades do setor */}
        <SecaoTarefasSetor setor="transferencia" />
      </div>

      <ModalResumoVenda venda={vendaSelecionada} onFechar={() => setVendaSelecionada(null)} />

      {/* Dialog — enviar ao despachante */}
      <Dialog open={!!atividadeEnviando} onOpenChange={(open) => !open && setAtividadeEnviando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar ao Despachante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {atividadeEnviando && (
              <p className="text-sm text-gray-500">
                {atividadeEnviando.sales.marca} {atividadeEnviando.sales.modelo} — {atividadeEnviando.sales.placa}
              </p>
            )}
            <div>
              <Label className="text-xs font-medium">Despachante *</Label>
              <Select value={despachanteId} onValueChange={(v) => setDespachanteId(v ?? '')}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o despachante" />
                </SelectTrigger>
                <SelectContent>
                  {despachantes.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}{d.empresa ? ` — ${d.empresa}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={enviarAoDespachante} disabled={!despachanteId || enviando} className="flex-1">
                {enviando ? 'Enviando...' : 'Confirmar Envio'}
              </Button>
              <Button variant="outline" onClick={() => setAtividadeEnviando(null)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — registrar pendência de atividade (antes do despachante) */}
      <Dialog open={!!atividadeComPendencia} onOpenChange={(open) => !open && setAtividadeComPendencia(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Registrar Pendência
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {atividadeComPendencia && (
              <p className="text-sm text-gray-500">
                {atividadeComPendencia.sales.marca} {atividadeComPendencia.sales.modelo} — {atividadeComPendencia.sales.placa}
              </p>
            )}
            <div>
              <Label className="text-xs font-medium">Descrição da pendência *</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                rows={3}
                placeholder="Descreva o motivo da pendência..."
                value={descNovaPendencia}
                onChange={(e) => setDescNovaPendencia(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={salvarPendenciaAtividade}
                disabled={!descNovaPendencia.trim() || salvandoPendencia}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                {salvandoPendencia ? 'Salvando...' : 'Registrar Pendência'}
              </Button>
              <Button variant="outline" onClick={() => setAtividadeComPendencia(null)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — registrar pendência */}
      <Dialog open={!!processoEditando} onOpenChange={(open) => !open && setProcessoEditando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pendência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium">Descrição da pendência *</Label>
              <Input
                className="mt-1"
                placeholder="Descreva o problema identificado..."
                value={descPendencia}
                onChange={(e) => setDescPendencia(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={salvarPendencia} disabled={!descPendencia.trim() || atualizando} className="flex-1">
                {atualizando ? 'Salvando...' : 'Registrar'}
              </Button>
              <Button variant="outline" onClick={() => setProcessoEditando(null)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BadgeTransferencia({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    enviado: { label: 'No Despachante', className: 'bg-blue-100 text-blue-700' },
    pendencia: { label: 'Com Pendência', className: 'bg-amber-100 text-amber-700' },
    concluido: { label: 'Concluído', className: 'bg-green-100 text-green-700' },
  }
  const { label, className } = config[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return <Badge className={`text-xs border-0 rounded-full ${className}`}>{label}</Badge>
}
