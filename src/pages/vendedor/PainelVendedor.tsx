import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useRequererPerfil } from '@/hooks/useAuth'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { marcarPendenciaConcluida, listarVendasDoVendedor } from '@/services/vendas'
import { listarAnexos, type AnexoVenda } from '@/services/anexos'
import UploadFotos from '@/components/vendas/UploadFotos'
import FiltrosPainel, { STATUS_VENDA, type FiltrosPainelState } from '@/components/ui/FiltrosPainel'
import {
  statusPrazo72h,
  horasRestantes,
  formatarData,
  corPorStatusPrazo,
} from '@/lib/prazos'
import type { VendaListagem } from '@/services/vendas'
import { PlusCircle, Car, Clock, CheckCircle2, AlertCircle, Camera, ChevronDown, ChevronUp } from 'lucide-react'

const MIN_FOTOS = 5

export default function PainelVendedor() {
  useRequererPerfil(['vendedor', 'supervisor'])

  const { usuario } = useAuthStore()
  const navigate = useNavigate()
  const [vendas, setVendas] = useState<VendaListagem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtros, setFiltros] = useState<FiltrosPainelState>({ de: '', ate: '', status: '' })

  useEffect(() => {
    if (!usuario?.id) return
    setCarregando(true)
    setErro(null)
    listarVendasDoVendedor(usuario.id, filtros)
      .then(setVendas)
      .catch(() => setErro('Erro ao carregar vendas.'))
      .finally(() => setCarregando(false))
  }, [usuario?.id, filtros])

  const acoes = (
    <Button size="sm" onClick={() => navigate('/vendedor/nova-venda')}>
      <PlusCircle size={14} className="mr-1.5" />
      Nova Venda
    </Button>
  )

  return (
    <div className="flex flex-col flex-1">
      <Header
        titulo="Minhas Vendas"
        subtitulo={`${vendas.length} venda${vendas.length !== 1 ? 's' : ''} registrada${vendas.length !== 1 ? 's' : ''}`}
        acoes={acoes}
      />

      <div className="flex-1 p-4 md:p-6 space-y-4">
        <FiltrosPainel
          filtros={filtros}
          onChange={setFiltros}
          opcoesStatus={STATUS_VENDA}
          totalExibido={vendas.length}
        />

        {carregando && (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-400 text-sm">Carregando vendas...</p>
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {erro}
          </div>
        )}

        {!carregando && !erro && vendas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Car size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma venda encontrada</p>
            <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros ou clique em "Nova Venda"</p>
          </div>
        )}

        {!carregando && vendas.length > 0 && (
          <div className="space-y-3">
            {vendas.map((venda) => (
              <CartaoVenda
                key={venda.id}
                venda={venda}
                onRecarregar={() => {
                  if (!usuario?.id) return
                  listarVendasDoVendedor(usuario.id, filtros).then(setVendas).catch(() => {})
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------

interface CartaoVendaProps {
  venda: VendaListagem
  onRecarregar: () => void
}

function CartaoVenda({ venda, onRecarregar }: CartaoVendaProps) {
  const pendenciasAbertas = venda.seller_pendencies.filter(
    (p) => p.status === 'aberta' || p.status === 'aguardando_aprovacao'
  )

  const [fotosAberto, setFotosAberto] = useState(false)
  const [fotos, setFotos] = useState<AnexoVenda[]>([])
  const [carregandoFotos, setCarregandoFotos] = useState(false)

  async function abrirFotos() {
    if (fotosAberto) { setFotosAberto(false); return }
    setFotosAberto(true)
    if (fotos.length === 0) {
      setCarregandoFotos(true)
      try {
        const dados = await listarAnexos(venda.id)
        setFotos(dados)
      } finally {
        setCarregandoFotos(false)
      }
    }
  }

  async function concluirPendencia(id: string) {
    try {
      await marcarPendenciaConcluida(id)
      onRecarregar()
    } catch {
      // erro silencioso
    }
  }

  const faltamFotos = Math.max(0, MIN_FOTOS - fotos.length)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      {/* Linha principal */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">
              {venda.marca} {venda.modelo} {venda.ano_modelo}
            </p>
            <span className="text-gray-400 text-xs">·</span>
            <span className="text-xs text-gray-500 font-mono uppercase">{venda.placa}</span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{venda.comprador_nome}</p>
          <p className="text-xs text-gray-400 mt-1">{formatarData(venda.criado_em)}</p>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <BadgeStatus status={venda.status} />
          <p className="text-sm font-semibold text-gray-700">
            {formatarMoeda(venda.valor_venda)}
          </p>
        </div>
      </div>

      {/* Pendências do vendedor */}
      {pendenciasAbertas.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Pendências ({pendenciasAbertas.length})
          </p>
          {pendenciasAbertas.map((p) => {
            const statusP = statusPrazo72h(p.prazo)
            const horas = horasRestantes(p.prazo)
            const aguardando = p.status === 'aguardando_aprovacao'

            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  {aguardando ? (
                    <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={14} className={`flex-shrink-0 ${corPorStatusPrazo(statusP)}`} />
                  )}
                  <span className="text-gray-700">
                    {p.tipo === 'vistoria' ? 'Vistoria do veículo' : 'Reconhecimento de firma / GOV.BR'}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!aguardando && (
                    <span className={`text-xs flex items-center gap-1 ${corPorStatusPrazo(statusP)}`}>
                      <Clock size={11} />
                      {statusP === 'vencido' ? 'Vencida' : `${horas}h restantes`}
                    </span>
                  )}
                  {aguardando ? (
                    <span className="text-xs text-blue-600 font-medium">Aguardando aprovação</span>
                  ) : (
                    <button
                      onClick={() => concluirPendencia(p.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                    >
                      Marcar concluída
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Progresso dos setores */}
      {venda.sector_activities.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {venda.sector_activities.map((a) => (
              <div key={a.id} className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    a.status === 'concluida' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span className="text-xs text-gray-500 capitalize">{a.setor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fotos do veículo */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={abrirFotos}
          className="w-full flex items-center justify-between text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Camera size={13} />
            <span>Fotos do Veículo</span>
            {/* Indicador: vermelho se faltam fotos, verde se ok */}
            {fotos.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                faltamFotos > 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-green-100 text-green-700'
              }`}>
                {fotos.length}/{MIN_FOTOS} mín.
              </span>
            )}
            {fotos.length === 0 && !fotosAberto && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-600">
                Adicionar fotos
              </span>
            )}
          </div>
          {fotosAberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {fotosAberto && (
          <div className="mt-3">
            {carregandoFotos ? (
              <p className="text-xs text-gray-400">Carregando fotos...</p>
            ) : (
              <UploadFotos saleId={venda.id} fotos={fotos} onChange={setFotos} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------

function BadgeStatus({ status }: { status: VendaListagem['status'] }) {
  const config: Record<string, { label: string; className: string }> = {
    iniciada: { label: 'Iniciada', className: 'bg-gray-100 text-gray-600' },
    pendencia_vendedor: { label: 'Pendência', className: 'bg-amber-100 text-amber-700' },
    concluida: { label: 'Concluída', className: 'bg-green-100 text-green-700' },
    cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-600' },
  }
  const { label, className } = config[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <Badge className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${className}`}>
      {label}
    </Badge>
  )
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
