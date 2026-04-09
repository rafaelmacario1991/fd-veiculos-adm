import { useState, useEffect } from 'react'
import { useRequererPerfil } from '@/hooks/useAuth'
import {
  listarPendenciasAprovacao,
  aprovarPendencia,
  rejeitarPendencia,
  type PendenciaComVenda,
} from '@/services/supervisor'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'

export default function Aprovacoes() {
  useRequererPerfil(['supervisor'])

  const [pendencias, setPendencias] = useState<PendenciaComVenda[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)

  async function carregar() {
    setCarregando(true)
    try {
      const data = await listarPendenciasAprovacao()
      setPendencias(data)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function aprovar(id: string) {
    setProcessando(id)
    try { await aprovarPendencia(id); await carregar() }
    finally { setProcessando(null) }
  }

  async function rejeitar(id: string) {
    setProcessando(id)
    try { await rejeitarPendencia(id); await carregar() }
    finally { setProcessando(null) }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        titulo="Aprovações"
        subtitulo="Pendências do vendedor aguardando confirmação do supervisor"
      />

      <div className="flex-1 p-6">
        {carregando && <p className="text-gray-400 text-sm">Carregando...</p>}

        {!carregando && pendencias.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ShieldCheck size={40} className="text-green-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma pendência aguardando aprovação</p>
            <p className="text-gray-400 text-sm mt-1">
              Quando um vendedor marcar uma vistoria ou reconhecimento de firma como concluído,
              aparecerá aqui para sua aprovação.
            </p>
          </div>
        )}

        {!carregando && pendencias.length > 0 && (
          <div className="space-y-3 max-w-3xl">
            <p className="text-sm text-gray-500 mb-4">
              {pendencias.length} {pendencias.length === 1 ? 'item aguardando' : 'itens aguardando'} sua aprovação
            </p>

            {pendencias.map((p) => {
              const venda = p.sales as unknown as { marca: string; modelo: string; placa: string }
              const usuario = p.users as unknown as { nome: string }
              const emProcessamento = processando === p.id

              return (
                <div
                  key={p.id}
                  className="bg-white border border-amber-200 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Tipo */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.tipo === 'vistoria'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {p.tipo === 'vistoria' ? 'Vistoria do Veículo' : 'Reconhecimento de Firma / GOV.BR'}
                        </span>
                      </div>

                      {/* Veículo */}
                      <p className="font-semibold text-gray-900 text-sm">
                        {venda?.marca} {venda?.modelo}
                        <span className="font-mono text-gray-400 ml-2 uppercase text-xs">{venda?.placa}</span>
                      </p>

                      {/* Vendedor */}
                      <p className="text-sm text-gray-500 mt-1">
                        Vendedor: <span className="font-medium text-gray-700">{usuario?.nome ?? '—'}</span>
                      </p>

                      {/* Data de conclusão pelo vendedor */}
                      {p.concluido_em && (
                        <p className="text-xs text-gray-400 mt-1">
                          Marcado como concluído em{' '}
                          {new Date(p.concluido_em).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white min-w-[110px]"
                        onClick={() => aprovar(p.id)}
                        disabled={emProcessamento}
                      >
                        <CheckCircle2 size={14} className="mr-1.5" />
                        {emProcessamento ? 'Aprovando...' : 'Aprovar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 min-w-[110px]"
                        onClick={() => rejeitar(p.id)}
                        disabled={emProcessamento}
                      >
                        <XCircle size={14} className="mr-1.5" />
                        {emProcessamento ? 'Devolvendo...' : 'Devolver'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
