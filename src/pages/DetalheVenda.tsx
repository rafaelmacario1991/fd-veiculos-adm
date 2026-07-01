import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { buscarDetalheVenda, type DetalheVenda } from '@/services/detalhes'
import {
  excluirVenda, excluirAtividadeSetor,
  excluirPendenciaVendedor, excluirTransferencia,
} from '@/services/supervisor'
import { useAuthStore } from '@/store/authStore'
import ModalResumoVenda from '@/components/vendas/ModalResumoVenda'
import type { VendaListagem } from '@/services/vendas'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Eye, Trash2,
  CheckCircle2, Clock, AlertTriangle, Circle,
} from 'lucide-react'

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function fmtData(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function moeda(v: number | null | undefined) {
  if (v == null) return null
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ---------------------------------------------------------------
// Ícone de status do passo
// ---------------------------------------------------------------
type EstadoPasso = 'concluido' | 'pendente' | 'nao_iniciado' | 'problema'

function IconePasso({ estado }: { estado: EstadoPasso }) {
  if (estado === 'concluido')
    return <CheckCircle2 size={20} className="text-green-500" />
  if (estado === 'problema')
    return <AlertTriangle size={20} className="text-amber-500" />
  if (estado === 'pendente')
    return <Clock size={20} className="text-blue-500" />
  return <Circle size={20} className="text-gray-300" />
}

function corLinha(estado: EstadoPasso) {
  if (estado === 'concluido') return 'bg-green-400'
  if (estado === 'problema') return 'bg-amber-400'
  if (estado === 'pendente') return 'bg-blue-300'
  return 'bg-gray-200'
}

// ---------------------------------------------------------------
// Bloco de passo da linha de vida
// ---------------------------------------------------------------
interface PassoProps {
  icone: React.ReactNode
  titulo: string
  estado: EstadoPasso
  data?: string | null
  ultimo?: boolean
  children?: React.ReactNode
  onExcluir?: () => void
}

function Passo({ icone, titulo, estado, data, ultimo, children, onExcluir }: PassoProps) {
  const labels: Record<EstadoPasso, string> = {
    concluido: 'Concluído',
    pendente: 'Em andamento',
    problema: 'Com pendência',
    nao_iniciado: 'Aguardando',
  }
  const badgeClasses: Record<EstadoPasso, string> = {
    concluido: 'bg-green-100 text-green-700',
    pendente: 'bg-blue-100 text-blue-700',
    problema: 'bg-amber-100 text-amber-700',
    nao_iniciado: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="flex gap-4">
      {/* Coluna esquerda — ícone + linha */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shadow-sm">
          {icone}
          <IconePasso estado={estado} />
        </div>
        {!ultimo && (
          <div className={`w-0.5 flex-1 mt-1 min-h-[32px] ${corLinha(estado)}`} />
        )}
      </div>

      {/* Conteúdo */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold text-gray-800">{titulo}</span>
          <Badge className={`text-[10px] px-2 py-0 border-0 rounded-full ${badgeClasses[estado]}`}>
            {labels[estado]}
          </Badge>
          {onExcluir && (
            <button
              onClick={onExcluir}
              className="ml-auto p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        {data && (
          <p className="text-xs text-gray-400 mb-2">{data}</p>
        )}
        {children && (
          <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1.5 text-xs text-gray-600">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoLinha({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 min-w-[90px]">{label}:</span>
      <span className="text-gray-700 font-medium">{valor}</span>
    </div>
  )
}

// ---------------------------------------------------------------
// Página
// ---------------------------------------------------------------
export default function DetalheVenda() {
  const { saleId } = useParams<{ saleId: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const isSupervisor = usuario?.perfis.includes('supervisor') ?? false

  const [venda, setVenda] = useState<DetalheVenda | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [mostrarResumo, setMostrarResumo] = useState(false)

  // Exclusão do processo inteiro
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  async function handleExcluirVenda() {
    if (!saleId) return
    setExcluindo(true)
    setErroExclusao(null)
    try {
      await excluirVenda(saleId)
      navigate(-1)
    } catch {
      setErroExclusao('Erro ao excluir o processo. Tente novamente.')
      setExcluindo(false)
    }
  }

  async function handleExcluirAtividade(atividadeId: string) {
    if (!window.confirm('Excluir esta atividade? A ação não pode ser desfeita.')) return
    await excluirAtividadeSetor(atividadeId)
    if (saleId) buscarDetalheVenda(saleId).then(setVenda)
  }

  async function handleExcluirPendencia(pendenciaId: string) {
    if (!window.confirm('Excluir esta pendência? A ação não pode ser desfeita.')) return
    await excluirPendenciaVendedor(pendenciaId)
    if (saleId) buscarDetalheVenda(saleId).then(setVenda)
  }

  async function handleExcluirTransferencia(processoId: string) {
    if (!window.confirm('Excluir este processo de transferência? A ação não pode ser desfeita.')) return
    await excluirTransferencia(processoId)
    if (saleId) buscarDetalheVenda(saleId).then(setVenda)
  }

  useEffect(() => {
    if (!saleId) return
    setCarregando(true)
    buscarDetalheVenda(saleId)
      .then(setVenda)
      .finally(() => setCarregando(false))
  }, [saleId])

  if (carregando) {
    return (
      <div className="flex flex-col flex-1">
        <Header titulo="Detalhe da Venda" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!venda) {
    return (
      <div className="flex flex-col flex-1">
        <Header titulo="Detalhe da Venda" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Venda não encontrada.</p>
        </div>
      </div>
    )
  }

  // ── Calcular estado de cada passo ──────────────────────────────

  // Pendências do vendedor
  const pVistoria = venda.pendencias_vendedor.find((p) => p.tipo === 'vistoria')
  const pFirma = venda.pendencias_vendedor.find((p) => p.tipo === 'firma')
  const pendenciasOk = [pVistoria, pFirma].every((p) => p?.status === 'aprovada')
  const estadoPendencias: EstadoPasso =
    pendenciasOk ? 'concluido'
    : [pVistoria, pFirma].some((p) => p?.status === 'aguardando_aprovacao') ? 'pendente'
    : 'pendente'

  // Setores
  const atv = (setor: string) => venda.atividades.find((a) => a.setor === setor)
  const estadoSetor = (setor: string): EstadoPasso =>
    atv(setor)?.status === 'concluida' ? 'concluido'
    : atv(setor) ? 'pendente'
    : 'nao_iniciado'

  // Transferência
  const tr = venda.transferencia
  const estadoTransferencia: EstadoPasso =
    !tr ? estadoSetor('transferencia')
    : tr.status === 'concluido' ? 'concluido'
    : tr.status === 'pendencia' ? 'problema'
    : 'pendente'

  // Financeiro — tem pendências abertas?
  const pendsFinAbertas = venda.pendencias_financeiras.filter((p) => p.status === 'aberta')
  const estadoFinanceiro: EstadoPasso =
    atv('financeiro')?.status === 'concluida' ? 'concluido'
    : pendsFinAbertas.length > 0 ? 'problema'
    : atv('financeiro') ? 'pendente'
    : 'nao_iniciado'

  const formaLabel: Record<string, string> = {
    a_vista: 'À Vista', cartao: 'Cartão', financiamento: 'Financiamento',
  }
  const statusTransfLabel: Record<string, string> = {
    enviado: 'No despachante', pendencia: 'Com pendência', concluido: 'Concluído',
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        titulo={`${venda.marca} ${venda.modelo} ${venda.ano_modelo}`}
        subtitulo={`Placa ${venda.placa.toUpperCase()} · ${venda.comprador_nome}`}
        acoes={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft size={13} className="mr-1.5" />
              Voltar
            </Button>
            <Button size="sm" onClick={() => setMostrarResumo(true)}>
              <Eye size={13} className="mr-1.5" />
              Ver Resumo
            </Button>
            {isSupervisor && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setConfirmarExclusao(true)}
              >
                <Trash2 size={13} className="mr-1.5" />
                Excluir Processo
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 p-6 max-w-2xl">
        {/* Resumo rápido */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Valor</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{moeda(venda.valor_venda)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pagamento</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{formaLabel[venda.forma_pagamento] ?? venda.forma_pagamento}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Vendedor</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{venda.vendedor?.nome ?? '—'}</p>
          </div>
        </div>

        {/* Linha de Vida */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Linha de Vida do Processo
          </p>

          {/* 1. Venda registrada */}
          <Passo
            icone={<></>}
            titulo="Venda Registrada"
            estado="concluido"
            data={fmtData(venda.criado_em)}
          >
            <InfoLinha label="Comprador" valor={venda.comprador_nome} />
            <InfoLinha label="CPF/CNPJ" valor={venda.comprador_cpf_cnpj} />
            <InfoLinha label="Valor" valor={moeda(venda.valor_venda)} />
            <InfoLinha label="Pagamento" valor={formaLabel[venda.forma_pagamento]} />
            {venda.data_venda && (
              <InfoLinha label="Data da Venda" valor={new Date(venda.data_venda + 'T12:00:00').toLocaleDateString('pt-BR')} />
            )}
            {venda.data_prevista_entrega && (
              <InfoLinha label="Prev. de Entrega" valor={new Date(venda.data_prevista_entrega + 'T12:00:00').toLocaleDateString('pt-BR')} />
            )}
            {venda.veiculo_entrada && (
              <InfoLinha
                label="Veículo entrada"
                valor={`${venda.veiculo_entrada.marca} ${venda.veiculo_entrada.modelo} — ${venda.veiculo_entrada.placa}`}
              />
            )}
          </Passo>

          {/* 2. Pendências do Vendedor */}
          <Passo
            titulo="Pendências do Vendedor"
            estado={estadoPendencias}
            icone={<></>}
            onExcluir={isSupervisor && (pVistoria || pFirma)
              ? () => {
                  if (pVistoria) handleExcluirPendencia(pVistoria.id)
                  if (pFirma) handleExcluirPendencia(pFirma.id)
                }
              : undefined}
          >
            {[pVistoria, pFirma].filter(Boolean).map((p) => {
              if (!p) return null
              const label = p.tipo === 'vistoria' ? 'Vistoria do veículo' : 'Reconhecimento de firma / GOV.BR'
              const statusLabel: Record<string, string> = {
                aberta: 'Pendente',
                aguardando_aprovacao: 'Aguardando aprovação',
                aprovada: 'Aprovada',
              }
              return (
                <div key={p.id}>
                  <InfoLinha label={label} valor={statusLabel[p.status] ?? p.status} />
                  {p.aprovado_em && p.aprovador && (
                    <InfoLinha label="Aprovado por" valor={`${p.aprovador.nome} em ${fmtData(p.aprovado_em)}`} />
                  )}
                  {p.concluido_em && !p.aprovado_em && (
                    <InfoLinha label="Concluído em" valor={fmtData(p.concluido_em) ?? undefined} />
                  )}
                </div>
              )
            })}
            {!pVistoria && !pFirma && <p className="text-gray-400">Sem pendências registradas.</p>}
          </Passo>

          {/* 3. Contratos */}
          <Passo
            titulo="Contratos"
            estado={estadoSetor('contratos')}
            data={atv('contratos')?.concluido_em ? fmtData(atv('contratos')!.concluido_em) : undefined}
            icone={<></>}
            onExcluir={isSupervisor && atv('contratos') ? () => handleExcluirAtividade(atv('contratos')!.id) : undefined}
          >
            {atv('contratos')?.status === 'concluida' ? (
              <>
                <InfoLinha label="Formalizado em" valor={fmtData(atv('contratos')!.concluido_em)} />
                {atv('contratos')?.responsavel && (
                  <InfoLinha label="Por" valor={atv('contratos')!.responsavel!.nome} />
                )}
              </>
            ) : (
              <p className="text-gray-400">Aguardando formalização do contrato.</p>
            )}
          </Passo>

          {/* 4. Financeiro */}
          <Passo
            titulo="Financeiro"
            estado={estadoFinanceiro}
            data={atv('financeiro')?.concluido_em ? fmtData(atv('financeiro')!.concluido_em) : undefined}
            icone={<></>}
            onExcluir={isSupervisor && atv('financeiro') ? () => handleExcluirAtividade(atv('financeiro')!.id) : undefined}
          >
            {venda.pendencias_financeiras.length > 0 ? (
              <div className="space-y-1">
                {venda.pendencias_financeiras.map((p) => (
                  <div key={p.id} className="flex items-start gap-2">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      p.status === 'aberta' ? 'bg-red-400' : 'bg-green-400'
                    }`} />
                    <span className={p.status === 'encerrada' ? 'line-through text-gray-400' : ''}>
                      {p.descricao}
                      {p.encerrado_em && ` — encerrado em ${fmtData(p.encerrado_em)}`}
                    </span>
                  </div>
                ))}
                {atv('financeiro')?.status === 'concluida' && (
                  <InfoLinha label="Confirmado em" valor={fmtData(atv('financeiro')!.concluido_em)} />
                )}
              </div>
            ) : atv('financeiro')?.status === 'concluida' ? (
              <>
                <InfoLinha label="Confirmado em" valor={fmtData(atv('financeiro')!.concluido_em)} />
                {atv('financeiro')?.responsavel && (
                  <InfoLinha label="Por" valor={atv('financeiro')!.responsavel!.nome} />
                )}
              </>
            ) : (
              <p className="text-gray-400">Aguardando confirmação do pagamento.</p>
            )}
          </Passo>

          {/* 5. Fiscal */}
          <Passo
            titulo="Fiscal — NF-e"
            estado={estadoSetor('fiscal')}
            data={atv('fiscal')?.concluido_em ? fmtData(atv('fiscal')!.concluido_em) : undefined}
            icone={<></>}
            onExcluir={isSupervisor && atv('fiscal') ? () => handleExcluirAtividade(atv('fiscal')!.id) : undefined}
          >
            {atv('fiscal')?.status === 'concluida' ? (
              <>
                {atv('fiscal')?.dados_json?.numero_nfe && (
                  <InfoLinha label="NF-e nº" valor={String(atv('fiscal')!.dados_json!.numero_nfe)} />
                )}
                {atv('fiscal')?.dados_json?.data_emissao && (
                  <InfoLinha label="Emissão" valor={String(atv('fiscal')!.dados_json!.data_emissao)} />
                )}
                {atv('fiscal')?.responsavel && (
                  <InfoLinha label="Por" valor={atv('fiscal')!.responsavel!.nome} />
                )}
              </>
            ) : (
              <p className="text-gray-400">Aguardando registro da NF-e.</p>
            )}
          </Passo>

          {/* 6. Transferência */}
          <Passo
            titulo="Transferência"
            estado={estadoTransferencia}
            data={tr ? fmtData(tr.data_envio) : undefined}
            ultimo
            icone={<></>}
            onExcluir={isSupervisor && tr ? () => handleExcluirTransferencia(tr.id) : undefined}
          >
            {tr ? (
              <>
                <InfoLinha label="Status" valor={statusTransfLabel[tr.status] ?? tr.status} />
                <InfoLinha label="Despachante" valor={tr.despachante?.nome} />
                {tr.despachante?.empresa && (
                  <InfoLinha label="Empresa" valor={tr.despachante.empresa} />
                )}
                <InfoLinha
                  label="Prazo"
                  valor={new Date(tr.prazo).toLocaleDateString('pt-BR')}
                />
                {tr.descricao_pendencia && (
                  <InfoLinha label="Pendência" valor={tr.descricao_pendencia} />
                )}
                {tr.status === 'concluido' && (
                  <InfoLinha label="Concluído em" valor={fmtData(tr.atualizado_em)} />
                )}
              </>
            ) : (
              <p className="text-gray-400">Aguardando envio ao despachante.</p>
            )}
          </Passo>
        </div>
      </div>

      {/* Modal confirmação exclusão */}
      {confirmarExclusao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Excluir processo</h3>
                <p className="text-xs text-gray-500 mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-1">
              Tem certeza que deseja excluir o processo de venda de{' '}
              <strong>{venda.marca} {venda.modelo} — {venda.placa.toUpperCase()}</strong>?
            </p>
            <p className="text-xs text-gray-500 mb-5">
              Todas as atividades, pendências, transferência e documentos serão permanentemente removidos.
            </p>
            {erroExclusao && (
              <p className="text-xs text-red-600 mb-3">{erroExclusao}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setConfirmarExclusao(false); setErroExclusao(null) }}
                disabled={excluindo}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleExcluirVenda}
                disabled={excluindo}
              >
                {excluindo ? 'Excluindo...' : 'Sim, excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resumo de Venda */}
      <ModalResumoVenda
        venda={mostrarResumo ? (venda as unknown as VendaListagem) : null}
        onFechar={() => setMostrarResumo(false)}
      />
    </div>
  )
}
