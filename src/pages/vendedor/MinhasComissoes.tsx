import { useState, useEffect } from 'react'
import { useRequererPerfil } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import {
  listarComissoes,
  adicionarComissao,
  excluirComissao,
  buscarConfig,
  salvarConfig,
  calcularRetornoFinanciamento,
  calcularFaixa,
  calcularValorEntrada,
  type Comissao,
  type ComissaoConfig,
  type TipoComissao,
} from '@/services/comissoes'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus, Trash2, TrendingDown, Wallet,
  Settings, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Printer,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const TIPO_LABEL: Record<TipoComissao, { label: string; cor: string }> = {
  financiamento: { label: 'Financiamento',  cor: 'bg-blue-100 text-blue-700' },
  a_vista:       { label: 'À Vista',        cor: 'bg-green-100 text-green-700' },
  transferencia: { label: 'Transferência',  cor: 'bg-purple-100 text-purple-700' },
  vale:          { label: 'Vale',           cor: 'bg-red-100 text-red-700' },
}

export default function MinhasComissoes() {
  useRequererPerfil(['vendedor', 'supervisor'])

  const { usuario } = useAuthStore()
  const [comissoes, setComissoes]   = useState<Comissao[]>([])
  const [config, setConfig]         = useState<ComissaoConfig | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto]   = useState(false)
  const [configAberta, setConfigAberta] = useState(false)

  async function carregar() {
    if (!usuario?.id) return
    setCarregando(true)
    try {
      const [lista, cfg] = await Promise.all([
        listarComissoes(usuario.id),
        buscarConfig(usuario.id),
      ])
      setComissoes(lista)
      setConfig(cfg)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [usuario?.id])

  // ── Cálculo dinâmico retroativo ──────────────────────────────
  const totalVendas = comissoes.filter(
    (c) => c.tipo === 'financiamento' || c.tipo === 'a_vista'
  ).length

  const faixaAtual = config ? calcularFaixa(config, totalVendas) : null
  const valorBase  = faixaAtual?.valorBase ?? 0

  const salarioBase        = config?.salario_base ?? 0
  const comissaoVendas     = totalVendas * valorBase
  const retornoTotal       = comissoes
    .filter((c) => c.tipo === 'financiamento' && c.valor_financiado != null && c.retorno != null)
    .reduce((s, c) => s + calcularRetornoFinanciamento(c.valor_financiado!, c.retorno!), 0)
  const transferenciaTotal = comissoes
    .filter((c) => c.tipo === 'transferencia')
    .reduce((s, c) => s + c.valor_comissao, 0)
  const transferenciaEmbutidaTotal = comissoes
    .filter((c) => (c.tipo === 'a_vista' || c.tipo === 'financiamento') && c.valor_comissao > 0)
    .reduce((s, c) => s + c.valor_comissao, 0)
  const valesTotal         = comissoes
    .filter((c) => c.tipo === 'vale')
    .reduce((s, c) => s + c.valor_comissao, 0)

  const creditos = salarioBase + comissaoVendas + retornoTotal + transferenciaTotal + transferenciaEmbutidaTotal
  const liquido  = creditos - valesTotal

  const agora = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

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
        subtitulo={`${totalVendas} venda${totalVendas !== 1 ? 's' : ''} · Faixa ${faixaAtual?.faixa ?? '—'} ativa`}
      />

      <div className="flex-1 p-4 md:p-6 space-y-4">

        {/* ── Configuração (oculta no print) ── */}
        <div className="print-hidden">
          <PainelConfig
            config={config}
            aberto={configAberta || !config}
            onToggle={() => setConfigAberta((v) => !v)}
            vendedorId={usuario?.id ?? ''}
            onSalvo={(nova) => { setConfig(nova); setConfigAberta(false) }}
          />
        </div>

        {/* ── Faixa ativa (oculta no print) ── */}
        {config && faixaAtual && (
          <div className={`print-hidden flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm border ${
            faixaAtual.faixa === 3 ? 'bg-blue-50 border-blue-200 text-blue-800' :
            faixaAtual.faixa === 2 ? 'bg-indigo-50 border-indigo-200 text-indigo-800' :
            'bg-gray-50 border-gray-200 text-gray-700'
          }`}>
            <RefreshCw size={13} className="flex-shrink-0" />
            <span className="font-medium">Faixa {faixaAtual.faixa} ativa</span>
            <span className="text-gray-400">·</span>
            <span>{moeda(valorBase)}/venda aplicado a todas as {totalVendas} vendas</span>
            <span className="text-gray-400">·</span>
            <span className="text-xs">
              {faixaAtual.faixa === 1
                ? `${totalVendas}/${config.meta_vendas} para Faixa 2`
                : faixaAtual.faixa === 2
                  ? `${totalVendas}/${config.meta_vendas2} para Faixa 3`
                  : 'Faixa máxima atingida'}
            </span>
          </div>
        )}

        {/* ── Cards de resumo ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Salário Base</p>
            <p className="text-base font-bold text-gray-800">{moeda(salarioBase)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Comissão Vendas</p>
            <p className="text-base font-bold text-blue-600">{moeda(comissaoVendas + retornoTotal + transferenciaTotal)}</p>
            <p className="text-[11px] text-gray-400">
              {totalVendas}v × {moeda(valorBase)}{retornoTotal > 0 ? ' + retornos' : ''}{(transferenciaTotal + transferenciaEmbutidaTotal) > 0 ? ' + transf.' : ''}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown size={13} className="text-red-500" />
              <p className="text-xs text-gray-500 font-medium">Vales</p>
            </div>
            <p className="text-base font-bold text-red-600">- {moeda(valesTotal)}</p>
          </div>
          <div className={`border rounded-xl p-4 ${liquido >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet size={13} className={liquido >= 0 ? 'text-green-600' : 'text-red-600'} />
              <p className="text-xs font-medium text-gray-600">Líquido</p>
            </div>
            <p className={`text-base font-bold ${liquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {moeda(liquido)}
            </p>
          </div>
        </div>

        {/* ── Botões (ocultos no print) ── */}
        <div className="print-hidden flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => window.print()}
            disabled={!config || comissoes.length === 0}
          >
            <Printer size={14} className="mr-1.5" />
            Imprimir / Salvar PDF
          </Button>
          <Button onClick={() => setModalAberto(true)} disabled={!config}>
            <Plus size={14} className="mr-1.5" />
            Nova Entrada
          </Button>
        </div>

        {!config && (
          <div className="print-hidden flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle size={14} />
            Configure as faixas e o salário base antes de adicionar entradas.
          </div>
        )}

        {/* ── Lista ── */}
        {carregando && <p className="print-hidden text-sm text-gray-400">Carregando...</p>}

        {!carregando && comissoes.length === 0 && config && (
          <div className="print-hidden flex flex-col items-center justify-center h-40 text-center">
            <Wallet size={36} className="text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma entrada registrada</p>
            <button onClick={() => setModalAberto(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline">
              Adicionar primeira entrada
            </button>
          </div>
        )}

        {!carregando && comissoes.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

            {/* ── Cabeçalho visível só no print ── */}
            <div className="print-only" style={{ display: 'none' }}>
              <div style={{ borderBottom: '2px solid #1E40AF', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#1E40AF', margin: 0 }}>FD Veículos</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '2px 0 0' }}>
                      Espelho de Comissão
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#6B7280' }}>
                    <p style={{ margin: 0 }}>Vendedor: <strong>{usuario?.nome}</strong></p>
                    <p style={{ margin: '2px 0 0' }}>Gerado em: {agora}</p>
                    <p style={{ margin: '2px 0 0' }}>
                      Faixa ativa: <strong>Faixa {faixaAtual?.faixa ?? '—'}</strong>
                      {faixaAtual ? ` (${moeda(valorBase)}/venda)` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabela de resumo */}
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: '#F3F4F6' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#374151', fontWeight: 600 }}>Item</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#374151', fontWeight: 600 }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '5px 8px', color: '#374151' }}>Salário Base</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#374151' }}>{moeda(salarioBase)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '5px 8px', color: '#374151' }}>
                      Comissão de Vendas ({totalVendas} × {moeda(valorBase)})
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#374151' }}>{moeda(comissaoVendas)}</td>
                  </tr>
                  {retornoTotal > 0 && (
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '5px 8px', color: '#374151' }}>Retorno (Financiamentos)</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#374151' }}>{moeda(retornoTotal)}</td>
                    </tr>
                  )}
                  {(transferenciaTotal + transferenciaEmbutidaTotal) > 0 && (
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '5px 8px', color: '#374151' }}>Comissões por Transferência</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#374151' }}>{moeda(transferenciaTotal + transferenciaEmbutidaTotal)}</td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '2px solid #D1D5DB', background: '#F9FAFB' }}>
                    <td style={{ padding: '6px 8px', color: '#111827', fontWeight: 600 }}>(=) Total Créditos</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#111827', fontWeight: 600 }}>{moeda(creditos)}</td>
                  </tr>
                  {valesTotal > 0 && (
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '5px 8px', color: '#DC2626' }}>(-) Vales / Descontos</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#DC2626' }}>- {moeda(valesTotal)}</td>
                    </tr>
                  )}
                  <tr style={{ background: liquido >= 0 ? '#F0FDF4' : '#FEF2F2' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 700, color: liquido >= 0 ? '#15803D' : '#DC2626', fontSize: '13px' }}>
                      (=) Total Líquido
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: liquido >= 0 ? '#15803D' : '#DC2626', fontSize: '13px' }}>
                      {moeda(liquido)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: '11px', fontWeight: 600, color: '#374151', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Detalhamento
              </p>
            </div>

            {/* Cabeçalho da lista (só na tela) */}
            <div className="print-hidden flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
              <RefreshCw size={11} className="text-gray-400" />
              <p className="text-[11px] text-gray-400">
                Valores recalculados com Faixa {faixaAtual?.faixa} ({moeda(valorBase)}/venda)
              </p>
            </div>

            <div className="divide-y divide-gray-50">
              {comissoes.map((c) => {
                const cfg    = TIPO_LABEL[c.tipo]
                const eVale  = c.tipo === 'vale'
                const valor  = calcularValorEntrada(c, valorBase)
                const retorno = c.tipo === 'financiamento' && c.valor_financiado != null && c.retorno != null
                  ? calcularRetornoFinanciamento(c.valor_financiado, c.retorno)
                  : null

                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[11px] border-0 rounded-full ${cfg.cor}`}>
                          {cfg.label}
                        </Badge>
                        {c.descricao && (
                          <span className="text-sm text-gray-700 truncate">{c.descricao}</span>
                        )}
                        {c.placa && (
                          <span className="text-xs text-gray-400 font-mono uppercase">{c.placa}</span>
                        )}
                      </div>

                      {c.tipo === 'financiamento' && retorno !== null && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Base: {moeda(valorBase)} + Retorno: {moeda(retorno)}
                          {c.valor_comissao > 0 ? ` + Transf.: ${moeda(c.valor_comissao)}` : ''}
                        </p>
                      )}
                      {c.tipo === 'a_vista' && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Base Faixa {faixaAtual?.faixa}: {moeda(valorBase)}
                          {c.valor_comissao > 0 ? ` + Transf.: ${moeda(c.valor_comissao)}` : ''}
                        </p>
                      )}

                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {format(parseISO(c.criado_em), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className={`text-sm font-semibold ${eVale ? 'text-red-600' : 'text-green-600'}`}>
                        {eVale ? '- ' : '+ '}{moeda(valor)}
                      </p>
                      <button
                        onClick={() => handleExcluir(c.id)}
                        className="print-hidden p-1 text-gray-300 hover:text-red-500 transition-colors rounded opacity-0 group-hover:opacity-100"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Rodapé do print */}
            <div className="print-only" style={{ display: 'none', borderTop: '1px solid #E5E7EB', padding: '10px 16px', fontSize: '10px', color: '#9CA3AF', textAlign: 'center' }}>
              FD Veículos · Av. Marechal Mascarenhas de Moraes, 4930 — Imbiribeira, Recife/PE ·
              Documento gerado em {agora}
            </div>
          </div>
        )}
      </div>

      {config && (
        <ModalNovaEntrada
          aberto={modalAberto}
          onFechar={() => setModalAberto(false)}
          onSalvo={() => { setModalAberto(false); carregar() }}
          vendedorId={usuario?.id ?? ''}
          config={config}
          totalVendas={totalVendas}
        />
      )}
    </div>
  )
}

// ── Painel de configuração ───────────────────────────────────────
function PainelConfig({
  config, aberto, onToggle, vendedorId, onSalvo,
}: {
  config: ComissaoConfig | null
  aberto: boolean
  onToggle: () => void
  vendedorId: string
  onSalvo: (c: ComissaoConfig) => void
}) {
  const [sal, setSal] = useState(String(config?.salario_base ?? ''))
  const [f1,  setF1]  = useState(String(config?.valor_faixa1 ?? ''))
  const [m1,  setM1]  = useState(String(config?.meta_vendas  ?? ''))
  const [f2,  setF2]  = useState(String(config?.valor_faixa2 ?? ''))
  const [m2,  setM2]  = useState(String(config?.meta_vendas2 ?? ''))
  const [f3,  setF3]  = useState(String(config?.valor_faixa3 ?? ''))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  useEffect(() => {
    if (config) {
      setSal(String(config.salario_base))
      setF1(String(config.valor_faixa1))
      setM1(String(config.meta_vendas))
      setF2(String(config.valor_faixa2))
      setM2(String(config.meta_vendas2))
      setF3(String(config.valor_faixa3))
    }
  }, [config])

  async function salvar() {
    const vsal = parseFloat(sal.replace(',', '.'))
    const vf1  = parseFloat(f1.replace(',', '.'))
    const vm1  = parseInt(m1)
    const vf2  = parseFloat(f2.replace(',', '.'))
    const vm2  = parseInt(m2)
    const vf3  = parseFloat(f3.replace(',', '.'))

    if (isNaN(vsal) || vsal < 0)   { setErro('Salário base inválido'); return }
    if (isNaN(vf1)  || vf1 < 0)    { setErro('Valor da Faixa 1 inválido'); return }
    if (isNaN(vm1)  || vm1 < 1)    { setErro('Meta 1 deve ser ≥ 1'); return }
    if (isNaN(vf2)  || vf2 < 0)    { setErro('Valor da Faixa 2 inválido'); return }
    if (isNaN(vm2)  || vm2 <= vm1) { setErro('Meta 2 deve ser maior que a Meta 1'); return }
    if (isNaN(vf3)  || vf3 < 0)    { setErro('Valor da Faixa 3 inválido'); return }

    setSalvando(true)
    setErro('')
    try {
      await salvarConfig(vendedorId, {
        salario_base: vsal,
        valor_faixa1: vf1, meta_vendas:  vm1,
        valor_faixa2: vf2, meta_vendas2: vm2,
        valor_faixa3: vf3,
      })
      onSalvo({
        vendedor_id: vendedorId,
        salario_base: vsal,
        valor_faixa1: vf1, meta_vendas:  vm1,
        valor_faixa2: vf2, meta_vendas2: vm2,
        valor_faixa3: vf3,
        atualizado_em: new Date().toISOString(),
      })
    } catch {
      setErro('Erro ao salvar configuração.')
    } finally {
      setSalvando(false)
    }
  }

  const vf1n = parseFloat(f1.replace(',', '.')), vm1n = parseInt(m1)
  const vf2n = parseFloat(f2.replace(',', '.')), vm2n = parseInt(m2)
  const vf3n = parseFloat(f3.replace(',', '.'))
  const vsaln = parseFloat(sal.replace(',', '.'))
  const previewValido = [vsaln, vf1n, vm1n, vf2n, vm2n, vf3n].every((v) => !isNaN(v) && v >= 0) && vm2n > vm1n

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Settings size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Configuração de Comissões
          </span>
          {config && (
            <span className="text-[11px] text-gray-400">
              Sal: {moeda(config.salario_base)}
              {' · '}F1: {moeda(config.valor_faixa1)} até {config.meta_vendas}v
              {' · '}F2: {moeda(config.valor_faixa2)} até {config.meta_vendas2}v
              {' · '}F3: {moeda(config.valor_faixa3)}
            </span>
          )}
        </div>
        {aberto ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">

          {/* Salário base */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Salário Base (R$)</Label>
              <Input className="mt-1" placeholder="Ex: 1500" value={sal} onChange={(e) => setSal(e.target.value)} />
              <p className="text-[11px] text-gray-400 mt-1">Valor fixo mensal, independente de vendas</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-3">Faixas de Comissão por Venda</p>

            {/* Faixa 1 */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs font-medium">Comissão Faixa 1 (R$/venda)</Label>
                <Input className="mt-1" placeholder="Ex: 200" value={f1} onChange={(e) => setF1(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium">Meta 1 — vendas até mudar para Faixa 2</Label>
                <Input className="mt-1" placeholder="Ex: 10" type="number" min={1} value={m1} onChange={(e) => setM1(e.target.value)} />
              </div>
            </div>

            {/* Faixa 2 */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs font-medium">Comissão Faixa 2 (R$/venda)</Label>
                <Input className="mt-1" placeholder="Ex: 350" value={f2} onChange={(e) => setF2(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium">Meta 2 — vendas até mudar para Faixa 3</Label>
                <Input className="mt-1" placeholder="Ex: 20" type="number" min={1} value={m2} onChange={(e) => setM2(e.target.value)} />
              </div>
            </div>

            {/* Faixa 3 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Comissão Faixa 3 (R$/venda)</Label>
                <Input className="mt-1" placeholder="Ex: 500" value={f3} onChange={(e) => setF3(e.target.value)} />
              </div>
              <div className="flex items-end pb-2">
                <p className="text-[11px] text-gray-400">
                  Aplicada a partir da {isNaN(vm2n) ? '?' : vm2n + 1}ª venda
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          {previewValido && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs space-y-1">
              <p className="font-semibold text-amber-800 mb-1">
                Ao atingir cada meta, TODAS as vendas são recalculadas:
              </p>
              <p className="text-gray-700">Vendas 1 a {vm1n}: <strong>{moeda(vf1n)}/venda</strong></p>
              <p className="text-gray-700">Vendas {vm1n + 1} a {vm2n}: <strong>{moeda(vf2n)}/venda</strong> (todas as anteriores também sobem)</p>
              <p className="text-gray-700">A partir da {vm2n + 1}ª: <strong>{moeda(vf3n)}/venda</strong> (todas as anteriores também sobem)</p>
              <p className="text-gray-400 pt-0.5">Financiamentos somam o retorno adicional. Salário base: {moeda(vsaln)}</p>
            </div>
          )}

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <Button onClick={salvar} disabled={salvando} size="sm">
            {salvando ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Modal de nova entrada ────────────────────────────────────────
function ModalNovaEntrada({
  aberto, onFechar, onSalvo, vendedorId, config, totalVendas,
}: {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  vendedorId: string
  config: ComissaoConfig
  totalVendas: number
}) {
  const [tipo, setTipo]                   = useState<TipoComissao>('financiamento')
  const [descricao, setDescricao]         = useState('')
  const [placa, setPlaca]                 = useState('')
  const [valorFinanciado, setValorFinanciado] = useState('')
  const [retorno, setRetorno]             = useState('')
  const [valorLivre, setValorLivre]       = useState('')
  const [comTransferencia, setComTransferencia] = useState(false)
  const [valorTransferencia, setValorTransferencia] = useState('')
  const [salvando, setSalvando]           = useState(false)
  const [erro, setErro]                   = useState('')

  const proximoTotal = tipo === 'financiamento' || tipo === 'a_vista' ? totalVendas + 1 : totalVendas
  const { faixa: proximaFaixa, valorBase } = calcularFaixa(config, proximoTotal)

  const vf  = parseFloat(valorFinanciado.replace(',', '.')) || 0
  const ret = parseFloat(retorno.replace(',', '.')) || 0
  const retornoCalc        = vf > 0 && ret > 0 ? calcularRetornoFinanciamento(vf, ret) : 0
  const totalFinanciamento = valorBase + retornoCalc
  const vtCalc = comTransferencia ? (parseFloat(valorTransferencia.replace(',', '.')) || 0) : 0

  function resetar() {
    setTipo('financiamento'); setDescricao(''); setPlaca('')
    setValorFinanciado(''); setRetorno(''); setValorLivre(''); setErro('')
    setComTransferencia(false); setValorTransferencia('')
  }
  function fechar() { resetar(); onFechar() }

  async function salvar() {
    setErro('')
    let valorComissao = 0

    if (tipo === 'financiamento') {
      if (!descricao.trim()) { setErro('Informe o veículo'); return }
      if (!vf || !ret) { setErro('Informe o valor financiado e o retorno'); return }
      if (comTransferencia && vtCalc <= 0) { setErro('Informe o valor da comissão por transferência'); return }
      valorComissao = vtCalc
    } else if (tipo === 'a_vista') {
      if (!descricao.trim()) { setErro('Informe o veículo'); return }
      if (comTransferencia && vtCalc <= 0) { setErro('Informe o valor da comissão por transferência'); return }
      valorComissao = vtCalc
    } else if (tipo === 'vale') {
      const v = parseFloat(valorLivre.replace(',', '.'))
      if (!descricao.trim()) { setErro('Informe a descrição do vale'); return }
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
          <div>
            <Label className="text-xs font-medium">Tipo *</Label>
            <Select value={tipo} onValueChange={(v) => {
              setTipo(v as TipoComissao)
              setErro('')
              setComTransferencia(false)
              setValorTransferencia('')
            }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="financiamento">Financiamento</SelectItem>
                <SelectItem value="a_vista">À Vista</SelectItem>
                <SelectItem value="vale">Vale (desconto)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(tipo === 'financiamento' || tipo === 'a_vista') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-medium">Veículo *</Label>
                <Input className="mt-1" placeholder="Ex: Gol 2020" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium">Placa</Label>
                <Input className="mt-1 uppercase" placeholder="AAA-0000" value={placa} onChange={(e) => setPlaca(e.target.value)} maxLength={8} />
              </div>
            </div>
          )}

          {(tipo === 'financiamento' || tipo === 'a_vista') && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex items-center justify-between">
              <span>
                Após esta venda: {proximoTotal} vendas → <strong>Faixa {proximaFaixa}</strong>
                {proximaFaixa !== calcularFaixa(config, totalVendas).faixa && (
                  <span className="ml-1 text-amber-600 font-medium">(faixa sobe! todas recalculadas)</span>
                )}
              </span>
              <span className="font-semibold text-gray-800">{moeda(valorBase)}/venda</span>
            </div>
          )}

          {tipo === 'financiamento' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Valor Financiado (R$) *</Label>
                  <Input className="mt-1" placeholder="0,00" value={valorFinanciado} onChange={(e) => setValorFinanciado(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-medium">Retorno *</Label>
                  <Input className="mt-1" placeholder="Ex: 3" value={retorno} onChange={(e) => setRetorno(e.target.value)} />
                </div>
              </div>
              {(retornoCalc > 0 || vtCalc > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Base Faixa {proximaFaixa}</span>
                    <span>{moeda(valorBase)}</span>
                  </div>
                  {retornoCalc > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Retorno ((VF × {ret}) × 0,75 × 0,001)</span>
                      <span>{moeda(retornoCalc)}</span>
                    </div>
                  )}
                  {vtCalc > 0 && (
                    <div className="flex justify-between text-purple-700">
                      <span>Comissão de Transferência</span>
                      <span>{moeda(vtCalc)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-blue-800 border-t border-blue-200 pt-1">
                    <span>Total desta venda</span>
                    <span>{moeda(totalFinanciamento + vtCalc)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {tipo === 'a_vista' && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-green-700 font-medium">Base Faixa {proximaFaixa}</span>
                <span className="font-bold text-green-700">{moeda(valorBase)}</span>
              </div>
              {vtCalc > 0 && (
                <>
                  <div className="flex items-center justify-between text-purple-700">
                    <span>Comissão de Transferência</span>
                    <span>{moeda(vtCalc)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-green-800 border-t border-green-200 pt-1">
                    <span>Total desta venda</span>
                    <span>{moeda(valorBase + vtCalc)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {(tipo === 'financiamento' || tipo === 'a_vista') && (
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={comTransferencia}
                  onChange={(e) => { setComTransferencia(e.target.checked); if (!e.target.checked) setValorTransferencia('') }}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-700">Comissão de Transferência?</span>
              </label>
              {comTransferencia && (
                <div>
                  <Label className="text-xs font-medium">Valor da Comissão de Transferência (R$) *</Label>
                  <Input
                    className="mt-1"
                    placeholder="0,00"
                    value={valorTransferencia}
                    onChange={(e) => setValorTransferencia(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {tipo === 'vale' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Nome / Descrição *</Label>
                <Input className="mt-1" placeholder="Ex: Vale alimentação — 25/06" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium">Valor a Descontar (R$) *</Label>
                <Input className="mt-1" placeholder="0,00" value={valorLivre} onChange={(e) => setValorLivre(e.target.value)} />
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
