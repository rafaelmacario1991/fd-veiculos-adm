import { useState, useEffect } from 'react'
import { useRequererPerfil } from '@/hooks/useAuth'
import { listarAtividadesDoSetor, concluirAtividadePorVenda, type AtividadeComVenda } from '@/services/setores'
import {
  listarDespachantes,
  criarTransferencia,
  listarTransferencias,
  atualizarStatusTransferencia,
  type ProcessoComDespachante,
} from '@/services/transferencias'
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
import { Truck, CheckCircle2, AlertTriangle, Clock, History } from 'lucide-react'
import type { Despachante } from '@/types'
import type { VendaListagem } from '@/services/vendas'
import { statusPrazo30dias, diasRestantes, corPorStatusPrazo, formatarDataCurta } from '@/lib/prazos'

export default function PainelTransferencia() {
  useRequererPerfil(['transferencia', 'supervisor'])

  const [pendentes, setPendentes] = useState<AtividadeComVenda[]>([])
  const [processos, setProcessos] = useState<ProcessoComDespachante[]>([])
  const [despachantes, setDespachantes] = useState<Despachante[]>([])
  const [carregando, setCarregando] = useState(true)

  // Dialog — enviar ao despachante
  const [atividadeEnviando, setAtividadeEnviando] = useState<AtividadeComVenda | null>(null)
  const [despachanteId, setDespachanteId] = useState('')
  const [enviando, setEnviando] = useState(false)

  const navigate = useNavigate()
  const [filtros, setFiltros] = useState<FiltrosPainelState>({ de: '', ate: '', status: '' })

  // Modal resumo de venda
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaListagem | null>(null)

  // Dialog — atualizar status
  const [processoEditando, setProcessoEditando] = useState<ProcessoComDespachante | null>(null)
  const [descPendencia, setDescPendencia] = useState('')
  const [atualizando, setAtualizando] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      const [pend, proc, desp] = await Promise.all([
        listarAtividadesDoSetor('transferencia'),
        listarTransferencias(filtros),
        listarDespachantes(),
      ])
      setPendentes(pend)
      setProcessos(proc)
      setDespachantes(desp)
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

  // Filtra vendas que já têm processo criado (aguarda apenas as sem processo)
  const saleIdsComProcesso = new Set(processos.map((p) => p.sale_id))
  const aguardandoEnvio = pendentes.filter((a) => !saleIdsComProcesso.has(a.sale_id))
  const processosAtivos = processos.filter((p) => p.status !== 'concluido')
  const processosConcluidos = processos.filter((p) => p.status === 'concluido')

  return (
    <div className="flex flex-col flex-1">
      <Header titulo="Transferência" />

      <div className="flex-1 p-4 md:p-6 space-y-4">
        <FiltrosPainel
          filtros={filtros}
          onChange={setFiltros}
          opcoesStatus={STATUS_TRANSFERENCIA}
          totalExibido={processos.length + aguardandoEnvio.length}
        />

        {carregando && <p className="text-gray-400 text-sm">Carregando...</p>}

        {!carregando && (
          <>
            {/* Aguardando envio ao despachante */}
            {aguardandoEnvio.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Aguardando Envio ao Despachante ({aguardandoEnvio.length})
                </p>
                <div className="space-y-3">
                  {aguardandoEnvio.map((a) => (
                    <CartaoSetor key={a.id} atividade={a}
                      onVerResumo={() => setVendaSelecionada(a.sales)}
                      onVerHistorico={() => navigate(`/venda/${a.sale_id}`)}>
                      <Button size="sm" onClick={() => setAtividadeEnviando(a)}>
                        <Truck size={13} className="mr-1.5" />
                        Enviar ao Despachante
                      </Button>
                    </CartaoSetor>
                  ))}
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
                            <BadgeTransferencia status={p.status} />
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
                          <BadgeTransferencia status={p.status} />
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

            {aguardandoEnvio.length === 0 && processosAtivos.length === 0 && processosConcluidos.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Truck size={40} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Nenhum processo ativo</p>
              </div>
            )}
          </>
        )}
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
