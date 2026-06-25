import { useState, useEffect } from 'react'
import { useRequererPerfil } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { listarAtividadesDoSetor, concluirAtividade, type AtividadeComVenda } from '@/services/setores'
import {
  listarPendenciasFinanceiras,
  registrarPendenciaFinanceira,
  encerrarPendenciaFinanceira,
} from '@/services/financeiro'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { CartaoSetor } from './PainelContratos'
import { Badge } from '@/components/ui/badge'
import ModalResumoVenda from '@/components/vendas/ModalResumoVenda'
import FiltrosPainel, { STATUS_ATIVIDADE, type FiltrosPainelState } from '@/components/ui/FiltrosPainel'
import { CheckCircle2, PlusCircle, X } from 'lucide-react'
import type { PendenciaFinanceira } from '@/types'
import type { VendaListagem } from '@/services/vendas'
import SecaoTarefasSetor from '@/components/tarefas/SecaoTarefasSetor'
import { excluirAtividadeSetor } from '@/services/supervisor'

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

  async function carregar() {
    setCarregando(true)
    try {
      const dados = await listarAtividadesDoSetor('financeiro', filtros)
      setAtividades(dados)
      // Carregar pendências de cada venda
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

  async function confirmarPagamento(atividade: AtividadeComVenda) {
    setProcessando(atividade.id)
    try {
      await concluirAtividade(atividade.id)
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

  const pendentes = atividades.filter((a) => a.status === 'pendente')
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
              const pendencias = pendenciasPorVenda[a.sale_id] ?? []
              const pendenciasAbertas = pendencias.filter((p) => p.status === 'aberta')
              return (
                <CartaoSetor key={a.id} atividade={a}
                  onVerResumo={() => setVendaSelecionada(a.sales)}
                  onVerHistorico={() => navigate(`/venda/${a.sale_id}`)}
                  onExcluir={isSupervisor ? () => handleExcluir(a.id) : undefined}
                  extra={
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      {/* Pendências existentes */}
                      {pendenciasAbertas.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge className="text-xs bg-red-100 text-red-700 border-0 rounded-full">Pendência</Badge>
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

                      {/* Adicionar pendência */}
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
                          <Button size="sm" className="h-8 text-xs" onClick={() => adicionarPendencia(a.sale_id)}
                            disabled={processando === `pend-${a.sale_id}`}>
                            OK
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAdicionandoPendencia(null)}>
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
                  <Button size="sm" onClick={() => confirmarPagamento(a)} disabled={processando === a.id}>
                    <CheckCircle2 size={13} className="mr-1.5" />
                    {processando === a.id ? 'Processando...' : 'Confirmar Pagamento'}
                  </Button>
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
                    <CartaoSetor key={a.id} atividade={a}
                      onVerResumo={() => setVendaSelecionada(a.sales)}
                      onVerHistorico={() => navigate(`/venda/${a.sale_id}`)}
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
        <SecaoTarefasSetor setor="financeiro" />
      </div>

      <ModalResumoVenda venda={vendaSelecionada} onFechar={() => setVendaSelecionada(null)} />
    </div>
  )
}
