import { useState, useEffect } from 'react'
import { useRequererPerfil } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import {
  listarComissoes,
  adicionarComissao,
  excluirComissao,
  calcularComissaoFinanciamento,
  type Comissao,
  type TipoComissao,
} from '@/services/comissoes'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Car, ArrowLeftRight, Banknote } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const TIPO_CONFIG: Record<TipoComissao, { label: string; cor: string; icone: React.ReactNode }> = {
  financiamento: {
    label: 'Financiamento',
    cor: 'bg-blue-100 text-blue-700',
    icone: <Banknote size={13} />,
  },
  a_vista: {
    label: 'À Vista',
    cor: 'bg-green-100 text-green-700',
    icone: <Car size={13} />,
  },
  transferencia: {
    label: 'Transferência',
    cor: 'bg-purple-100 text-purple-700',
    icone: <ArrowLeftRight size={13} />,
  },
  vale: {
    label: 'Vale',
    cor: 'bg-red-100 text-red-700',
    icone: <Wallet size={13} />,
  },
}

export default function MinhasComissoes() {
  useRequererPerfil(['vendedor', 'supervisor'])

  const { usuario } = useAuthStore()
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)

  async function carregar() {
    if (!usuario?.id) return
    setCarregando(true)
    try {
      setComissoes(await listarComissoes(usuario.id))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [usuario?.id])

  // Totais
  const creditos = comissoes
    .filter((c) => c.tipo !== 'vale')
    .reduce((s, c) => s + c.valor_comissao, 0)
  const vales = comissoes
    .filter((c) => c.tipo === 'vale')
    .reduce((s, c) => s + c.valor_comissao, 0)
  const liquido = creditos - vales

  async function handleExcluir(id: string) {
    if (!window.confirm('Excluir esta entrada?')) return
    try {
      await excluirComissao(id)
      await carregar()
    } catch { /* silent */ }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        titulo="Minhas Comissões"
        subtitulo={`${comissoes.length} entrada${comissoes.length !== 1 ? 's' : ''} registrada${comissoes.length !== 1 ? 's' : ''}`}
      />

      <div className="flex-1 p-4 md:p-6 space-y-5">

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-green-500" />
              <p className="text-xs text-gray-500 font-medium">Créditos</p>
            </div>
            <p className="text-lg font-bold text-green-600">{moeda(creditos)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} className="text-red-500" />
              <p className="text-xs text-gray-500 font-medium">Vales</p>
            </div>
            <p className="text-lg font-bold text-red-600">- {moeda(vales)}</p>
          </div>
          <div className={`border rounded-xl p-4 ${liquido >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={14} className={liquido >= 0 ? 'text-green-600' : 'text-red-600'} />
              <p className="text-xs font-medium text-gray-600">Líquido</p>
            </div>
            <p className={`text-lg font-bold ${liquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {moeda(liquido)}
            </p>
          </div>
        </div>

        {/* Botão nova entrada */}
        <div className="flex justify-end">
          <Button onClick={() => setModalAberto(true)}>
            <Plus size={14} className="mr-1.5" />
            Nova Entrada
          </Button>
        </div>

        {/* Lista */}
        {carregando && <p className="text-sm text-gray-400">Carregando...</p>}

        {!carregando && comissoes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Wallet size={36} className="text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma entrada registrada</p>
            <button
              onClick={() => setModalAberto(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Adicionar primeira entrada
            </button>
          </div>
        )}

        {!carregando && comissoes.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-50">
              {comissoes.map((c) => {
                const cfg = TIPO_CONFIG[c.tipo]
                const eVale = c.tipo === 'vale'
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[11px] border-0 rounded-full flex items-center gap-1 ${cfg.cor}`}>
                          {cfg.icone}
                          {cfg.label}
                        </Badge>
                        {c.descricao && (
                          <span className="text-sm text-gray-700 truncate">{c.descricao}</span>
                        )}
                        {c.placa && (
                          <span className="text-xs text-gray-400 font-mono uppercase">{c.placa}</span>
                        )}
                      </div>
                      {c.tipo === 'financiamento' && c.valor_financiado != null && c.retorno != null && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Financiado: {moeda(c.valor_financiado)} · Retorno: {c.retorno}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {format(parseISO(c.criado_em), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className={`text-sm font-semibold ${eVale ? 'text-red-600' : 'text-green-600'}`}>
                        {eVale ? '- ' : '+ '}{moeda(c.valor_comissao)}
                      </p>
                      <button
                        onClick={() => handleExcluir(c.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded opacity-0 group-hover:opacity-100"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <ModalNovaEntrada
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvo={() => { setModalAberto(false); carregar() }}
        vendedorId={usuario?.id ?? ''}
      />
    </div>
  )
}

// ── Modal de nova entrada ────────────────────────────────────
function ModalNovaEntrada({
  aberto, onFechar, onSalvo, vendedorId,
}: {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  vendedorId: string
}) {
  const [tipo, setTipo] = useState<TipoComissao>('financiamento')
  const [descricao, setDescricao] = useState('')
  const [placa, setPlaca] = useState('')
  const [valorFinanciado, setValorFinanciado] = useState('')
  const [retorno, setRetorno] = useState('')
  const [valorLivre, setValorLivre] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Cálculo em tempo real da comissão de financiamento
  const vf = parseFloat(valorFinanciado.replace(',', '.')) || 0
  const ret = parseFloat(retorno.replace(',', '.')) || 0
  const comissaoCalculada = tipo === 'financiamento' && vf > 0 && ret > 0
    ? calcularComissaoFinanciamento(vf, ret)
    : 0

  function resetar() {
    setTipo('financiamento')
    setDescricao('')
    setPlaca('')
    setValorFinanciado('')
    setRetorno('')
    setValorLivre('')
    setErro('')
  }

  function fechar() { resetar(); onFechar() }

  async function salvar() {
    setErro('')

    let valorComissao = 0

    if (tipo === 'financiamento') {
      if (!descricao.trim()) { setErro('Informe o veículo'); return }
      if (!vf || !ret) { setErro('Informe o valor financiado e o retorno'); return }
      valorComissao = comissaoCalculada
    } else if (tipo === 'a_vista') {
      if (!descricao.trim()) { setErro('Informe o veículo'); return }
      valorComissao = 0
    } else if (tipo === 'transferencia') {
      const v = parseFloat(valorLivre.replace(',', '.'))
      if (!descricao.trim()) { setErro('Informe a descrição'); return }
      if (!v || v <= 0) { setErro('Informe o valor da comissão'); return }
      valorComissao = v
    } else if (tipo === 'vale') {
      const v = parseFloat(valorLivre.replace(',', '.'))
      if (!descricao.trim()) { setErro('Informe o nome/descrição do vale'); return }
      if (!v || v <= 0) { setErro('Informe o valor do vale'); return }
      valorComissao = v
    }

    setSalvando(true)
    try {
      await adicionarComissao(vendedorId, {
        tipo,
        descricao: descricao.trim() || undefined,
        placa: placa.trim().toUpperCase() || undefined,
        valor_financiado: tipo === 'financiamento' ? vf : undefined,
        retorno: tipo === 'financiamento' ? ret : undefined,
        valor_comissao: valorComissao,
      })
      resetar()
      onSalvo()
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && fechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Entrada</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Tipo */}
          <div>
            <Label className="text-xs font-medium">Tipo *</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v as TipoComissao); setErro('') }}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="financiamento">Financiamento</SelectItem>
                <SelectItem value="a_vista">À Vista</SelectItem>
                <SelectItem value="transferencia">Comissão por Transferência</SelectItem>
                <SelectItem value="vale">Vale (desconto)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Veículo + Placa (financiamento e à vista) */}
          {(tipo === 'financiamento' || tipo === 'a_vista') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-medium">Veículo *</Label>
                <Input
                  className="mt-1"
                  placeholder="Ex: Gol 2020"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Placa</Label>
                <Input
                  className="mt-1 uppercase"
                  placeholder="AAA-0000"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                  maxLength={8}
                />
              </div>
            </div>
          )}

          {/* Campos específicos de Financiamento */}
          {tipo === 'financiamento' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Valor Financiado (R$) *</Label>
                <Input
                  className="mt-1"
                  placeholder="0,00"
                  value={valorFinanciado}
                  onChange={(e) => setValorFinanciado(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Retorno *</Label>
                <Input
                  className="mt-1"
                  placeholder="Ex: 3"
                  value={retorno}
                  onChange={(e) => setRetorno(e.target.value)}
                />
              </div>
              {comissaoCalculada > 0 && (
                <div className="col-span-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center justify-between">
                  <p className="text-xs text-green-700 font-medium">Comissão calculada</p>
                  <p className="text-sm font-bold text-green-700">
                    {comissaoCalculada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              )}
              <p className="col-span-2 text-[11px] text-gray-400">
                Fórmula: ((valor financiado × retorno) × 0,75) × 0,001
              </p>
            </div>
          )}

          {/* Transferência */}
          {tipo === 'transferencia' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Descrição *</Label>
                <Input
                  className="mt-1"
                  placeholder="Ex: Gol 2020 — João Silva"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Valor da Comissão (R$) *</Label>
                <Input
                  className="mt-1"
                  placeholder="0,00"
                  value={valorLivre}
                  onChange={(e) => setValorLivre(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Vale */}
          {tipo === 'vale' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Nome / Descrição do Vale *</Label>
                <Input
                  className="mt-1"
                  placeholder="Ex: Vale alimentação — 25/06"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Valor a Descontar (R$) *</Label>
                <Input
                  className="mt-1"
                  placeholder="0,00"
                  value={valorLivre}
                  onChange={(e) => setValorLivre(e.target.value)}
                />
              </div>
            </div>
          )}

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <Button onClick={salvar} disabled={salvando} className="flex-1">
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={fechar}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
