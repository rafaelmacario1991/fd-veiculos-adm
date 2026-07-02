import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRequererPerfil } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import {
  listarAtividadesDoSetor,
  concluirAtividade,
  atualizarDadosAtividade,
  type AtividadeComVenda,
} from '@/services/setores'
import { excluirAtividadeSetor } from '@/services/supervisor'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useNavigate } from 'react-router-dom'
import { CartaoSetor } from './PainelContratos'
import ModalResumoVenda from '@/components/vendas/ModalResumoVenda'
import FiltrosPainel, { STATUS_ATIVIDADE, type FiltrosPainelState } from '@/components/ui/FiltrosPainel'
import { CheckCircle2, Receipt, BookOpen, Check } from 'lucide-react'
import type { VendaListagem } from '@/services/vendas'
import SecaoTarefasSetor from '@/components/tarefas/SecaoTarefasSetor'

// ── Schemas ───────────────────────────────────────────────────
const schemaNfe = z.object({
  numero_nfe:   z.string().min(1, 'Obrigatório'),
  data_emissao: z.string().min(1, 'Obrigatório'),
})

const schemaLivro = z.object({
  numero_livro: z.string().min(1, 'Obrigatório'),
  pagina_livro: z.string().min(1, 'Obrigatório'),
})

type FormNfe   = z.infer<typeof schemaNfe>
type FormLivro = z.infer<typeof schemaLivro>

type TipoDialog = 'nfe' | 'livro_detran' | 'livro_rfb'

// ── Helpers ───────────────────────────────────────────────────
function dadosNfe(a: AtividadeComVenda): Record<string, unknown> | null {
  const d = a.dados_json
  if (!d) return null
  // Novo formato: { nfe: { numero_nfe, ... } }
  if ((d.nfe as Record<string, unknown>)?.numero_nfe) return d.nfe as Record<string, unknown>
  // Formato legado (atividade já concluída antes da mudança): { numero_nfe, data_emissao }
  if (d.numero_nfe) return { numero_nfe: d.numero_nfe, data_emissao: d.data_emissao }
  return null
}

function dadosLivro(a: AtividadeComVenda, tipo: 'livro_detran' | 'livro_rfb'): Record<string, unknown> | null {
  const d = a.dados_json
  if (!d) return null
  return (d[tipo] as Record<string, unknown>)?.numero_livro
    ? (d[tipo] as Record<string, unknown>)
    : null
}


const TITULO_DIALOG: Record<TipoDialog, string> = {
  nfe:          'Registrar NF-e',
  livro_detran: 'Registrar Livro DETRAN',
  livro_rfb:    'Registrar Livro RFB',
}

// ── Componente ────────────────────────────────────────────────
export default function PainelFiscal() {
  useRequererPerfil(['fiscal', 'supervisor'])

  const { usuario } = useAuthStore()
  const isSupervisor = usuario?.perfis.includes('supervisor') ?? false
  const [atividades, setAtividades] = useState<AtividadeComVenda[]>([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaListagem | null>(null)
  const [filtros, setFiltros] = useState<FiltrosPainelState>({ de: '', ate: '', status: '' })

  // Dialog aberto
  const [atividadeAberta, setAtividadeAberta] = useState<AtividadeComVenda | null>(null)
  const [tipoDialog, setTipoDialog] = useState<TipoDialog | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [concluindo, setConcluindo] = useState<string | null>(null)

  const pendentes  = atividades.filter((a) => a.status === 'pendente')
  const concluidas = atividades.filter((a) => a.status === 'concluida')

  // Formulário NF-e
  const formNfe = useForm<FormNfe>({ resolver: zodResolver(schemaNfe) })

  // Formulário Livro (DETRAN e RFB compartilham o mesmo schema)
  const formLivro = useForm<FormLivro>({ resolver: zodResolver(schemaLivro) })

  async function carregar() {
    setCarregando(true)
    try {
      const dados = await listarAtividadesDoSetor('fiscal', filtros)
      setAtividades(dados)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [filtros])

  function abrirDialog(atividade: AtividadeComVenda, tipo: TipoDialog) {
    setAtividadeAberta(atividade)
    setTipoDialog(tipo)

    if (tipo === 'nfe') {
      const salvo = dadosNfe(atividade)
      formNfe.reset({
        numero_nfe:   (salvo?.numero_nfe as string) ?? '',
        data_emissao: (salvo?.data_emissao as string) ?? '',
      })
    } else {
      const salvo = dadosLivro(atividade, tipo)
      formLivro.reset({
        numero_livro: (salvo?.numero_livro as string) ?? '',
        pagina_livro: (salvo?.pagina_livro as string) ?? '',
      })
    }
  }

  function fecharDialog() {
    setAtividadeAberta(null)
    setTipoDialog(null)
  }

  async function salvarNfe(dados: FormNfe) {
    if (!atividadeAberta) return
    setEnviando(true)
    try {
      await atualizarDadosAtividade(atividadeAberta.id, { nfe: dados })
      fecharDialog()
      await carregar()
    } finally {
      setEnviando(false)
    }
  }

  async function salvarLivro(dados: FormLivro) {
    if (!atividadeAberta || !tipoDialog || tipoDialog === 'nfe') return
    setEnviando(true)
    try {
      await atualizarDadosAtividade(atividadeAberta.id, { [tipoDialog]: dados })
      fecharDialog()
      await carregar()
    } finally {
      setEnviando(false)
    }
  }

  async function concluirFiscal(atividade: AtividadeComVenda) {
    setConcluindo(atividade.id)
    try {
      await concluirAtividade(atividade.id, atividade.dados_json ?? undefined)
      await carregar()
    } finally {
      setConcluindo(null)
    }
  }

  async function handleExcluir(id: string) {
    try {
      await excluirAtividadeSetor(id)
      await carregar()
    } catch { /* silent */ }
  }

  // ── Chip de status de sub-tarefa ──────────────────────────
  function ChipSubtarefa({
    rotulo,
    concluido,
    icone,
    onClick,
  }: {
    rotulo: string
    concluido: boolean
    icone: React.ReactNode
    onClick: () => void
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
          concluido
            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50'
        }`}
      >
        {concluido ? <Check size={12} className="text-green-600" /> : icone}
        {rotulo}
      </button>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        titulo="Fiscal"
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
            {pendentes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Pendentes ({pendentes.length})
                </p>
                <div className="space-y-3">
                  {pendentes.map((a) => {
                    const nfePronta      = !!dadosNfe(a)
                    const detranPronto   = !!dadosLivro(a, 'livro_detran')
                    const rfbPronto      = !!dadosLivro(a, 'livro_rfb')
                    const tudo           = nfePronta && detranPronto && rfbPronto
                    const qtdPronto      = [nfePronta, detranPronto, rfbPronto].filter(Boolean).length

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
                            {/* Chips das sub-tarefas */}
                            <div className="flex flex-wrap gap-2">
                              <ChipSubtarefa
                                rotulo="NF-e"
                                concluido={nfePronta}
                                icone={<Receipt size={12} />}
                                onClick={() => abrirDialog(a, 'nfe')}
                              />
                              <ChipSubtarefa
                                rotulo="Livro DETRAN"
                                concluido={detranPronto}
                                icone={<BookOpen size={12} />}
                                onClick={() => abrirDialog(a, 'livro_detran')}
                              />
                              <ChipSubtarefa
                                rotulo="Livro RFB"
                                concluido={rfbPronto}
                                icone={<BookOpen size={12} />}
                                onClick={() => abrirDialog(a, 'livro_rfb')}
                              />
                            </div>

                            {/* Progresso e botão concluir */}
                            <div className="flex items-center justify-between gap-3">
                              <span className={`text-xs font-medium ${tudo ? 'text-green-600' : 'text-gray-400'}`}>
                                {qtdPronto}/3 preenchidos
                              </span>
                              <Button
                                size="sm"
                                disabled={!tudo || concluindo === a.id}
                                onClick={() => concluirFiscal(a)}
                              >
                                <CheckCircle2 size={13} className="mr-1.5" />
                                {concluindo === a.id ? 'Concluindo...' : 'Concluir Fiscal'}
                              </Button>
                            </div>
                          </div>
                        }
                      >
                        {/* Sem filho extra aqui — o botão ficou no extra */}
                        <></>
                      </CartaoSetor>
                    )
                  })}
                </div>
              </div>
            )}

            {concluidas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Concluídos ({concluidas.length})
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

        <SecaoTarefasSetor setor="fiscal" />
      </div>

      <ModalResumoVenda venda={vendaSelecionada} onFechar={() => setVendaSelecionada(null)} />

      {/* ── Dialog unificado ── */}
      <Dialog open={!!atividadeAberta && !!tipoDialog} onOpenChange={(open) => { if (!open) fecharDialog() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tipoDialog ? TITULO_DIALOG[tipoDialog] : ''}</DialogTitle>
          </DialogHeader>

          {atividadeAberta && tipoDialog && (
            <div className="pt-1">
              <p className="text-sm text-gray-500 mb-4">
                {atividadeAberta.sales.marca} {atividadeAberta.sales.modelo} — {atividadeAberta.sales.placa}
              </p>

              {/* Formulário NF-e */}
              {tipoDialog === 'nfe' && (
                <form onSubmit={formNfe.handleSubmit(salvarNfe)} className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium">Número da NF-e *</Label>
                    <Input {...formNfe.register('numero_nfe')} className="mt-1" placeholder="000000000" />
                    {formNfe.formState.errors.numero_nfe && (
                      <p className="text-xs text-red-600 mt-1">{formNfe.formState.errors.numero_nfe.message}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Data de Emissão *</Label>
                    <Input {...formNfe.register('data_emissao')} type="date" className="mt-1" />
                    {formNfe.formState.errors.data_emissao && (
                      <p className="text-xs text-red-600 mt-1">{formNfe.formState.errors.data_emissao.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" disabled={enviando} className="flex-1">
                      {enviando ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button type="button" variant="outline" onClick={fecharDialog}>Cancelar</Button>
                  </div>
                </form>
              )}

              {/* Formulário Livro (DETRAN / RFB) */}
              {(tipoDialog === 'livro_detran' || tipoDialog === 'livro_rfb') && (
                <form onSubmit={formLivro.handleSubmit(salvarLivro)} className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium">N. do Livro *</Label>
                    <Input {...formLivro.register('numero_livro')} className="mt-1" placeholder="Ex: 0042" />
                    {formLivro.formState.errors.numero_livro && (
                      <p className="text-xs text-red-600 mt-1">{formLivro.formState.errors.numero_livro.message}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Página do Livro *</Label>
                    <Input {...formLivro.register('pagina_livro')} className="mt-1" placeholder="Ex: 015" />
                    {formLivro.formState.errors.pagina_livro && (
                      <p className="text-xs text-red-600 mt-1">{formLivro.formState.errors.pagina_livro.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" disabled={enviando} className="flex-1">
                      {enviando ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button type="button" variant="outline" onClick={fecharDialog}>Cancelar</Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
