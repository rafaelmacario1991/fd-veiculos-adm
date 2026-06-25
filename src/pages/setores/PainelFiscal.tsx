import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRequererPerfil } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { listarAtividadesDoSetor, concluirAtividade, type AtividadeComVenda } from '@/services/setores'
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
import { CheckCircle2, Receipt } from 'lucide-react'
import type { VendaListagem } from '@/services/vendas'
import SecaoTarefasSetor from '@/components/tarefas/SecaoTarefasSetor'

const schemaNfe = z.object({
  numero_nfe: z.string().min(1, 'Obrigatório'),
  data_emissao: z.string().min(1, 'Obrigatório'),
})

type FormNfe = z.infer<typeof schemaNfe>

export default function PainelFiscal() {
  useRequererPerfil(['fiscal', 'supervisor'])

  const { usuario } = useAuthStore()
  const isSupervisor = usuario?.perfis.includes('supervisor') ?? false
  const [atividades, setAtividades] = useState<AtividadeComVenda[]>([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()
  const [atividadeNfe, setAtividadeNfe] = useState<AtividadeComVenda | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaListagem | null>(null)
  const [filtros, setFiltros] = useState<FiltrosPainelState>({ de: '', ate: '', status: '' })

  const pendentes = atividades.filter((a) => a.status === 'pendente')
  const concluidas = atividades.filter((a) => a.status === 'concluida')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormNfe>({
    resolver: zodResolver(schemaNfe),
  })

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

  function abrirRegistroNfe(atividade: AtividadeComVenda) {
    setAtividadeNfe(atividade)
    reset()
  }

  async function handleExcluir(id: string) {
    try {
      await excluirAtividadeSetor(id)
      await carregar()
    } catch { /* silent */ }
  }

  async function registrarNfe(dados: FormNfe) {
    if (!atividadeNfe) return
    setEnviando(true)
    try {
      await concluirAtividade(atividadeNfe.id, {
        numero_nfe: dados.numero_nfe,
        data_emissao: dados.data_emissao,
      })
      setAtividadeNfe(null)
      await carregar()
    } finally {
      setEnviando(false)
    }
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
                  NF-e Pendentes ({pendentes.length})
                </p>
                <div className="space-y-3">
                  {pendentes.map((a) => (
                    <CartaoSetor key={a.id} atividade={a}
                      onVerResumo={() => setVendaSelecionada(a.sales)}
                      onVerHistorico={() => navigate(`/venda/${a.sale_id}`)}
                      onExcluir={isSupervisor ? () => handleExcluir(a.id) : undefined}>
                      <Button size="sm" onClick={() => abrirRegistroNfe(a)}>
                        <Receipt size={13} className="mr-1.5" />
                        Registrar NF-e
                      </Button>
                    </CartaoSetor>
                  ))}
                </div>
              </div>
            )}

            {concluidas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  NF-e Registradas ({concluidas.length})
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
        <SecaoTarefasSetor setor="fiscal" />
      </div>

      <ModalResumoVenda venda={vendaSelecionada} onFechar={() => setVendaSelecionada(null)} />

      {/* Dialog — registro da NF-e */}
      <Dialog open={!!atividadeNfe} onOpenChange={(open) => !open && setAtividadeNfe(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar NF-e</DialogTitle>
          </DialogHeader>
          {atividadeNfe && (
            <form onSubmit={handleSubmit(registrarNfe)} className="space-y-4 pt-2">
              <p className="text-sm text-gray-500">
                {atividadeNfe.sales.marca} {atividadeNfe.sales.modelo} — {atividadeNfe.sales.placa}
              </p>
              <div>
                <Label className="text-xs font-medium">Número da NF-e *</Label>
                <Input {...register('numero_nfe')} className="mt-1" placeholder="000000000" />
                {errors.numero_nfe && <p className="text-xs text-red-600 mt-1">{errors.numero_nfe.message}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">Data de Emissão *</Label>
                <Input {...register('data_emissao')} type="date" className="mt-1" />
                {errors.data_emissao && <p className="text-xs text-red-600 mt-1">{errors.data_emissao.message}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={enviando} className="flex-1">
                  {enviando ? 'Registrando...' : 'Confirmar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAtividadeNfe(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
