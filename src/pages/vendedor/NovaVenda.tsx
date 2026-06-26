import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/store/authStore'
import { useRequererPerfil } from '@/hooks/useAuth'
import { criarVenda } from '@/services/vendas'
import { salvarFotosNoBanco } from '@/services/anexos'
import { salvarDocumentosNoBanco } from '@/services/entradaVeiculo'
import { useVendasStore } from '@/store/vendasStore'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import UploadFotos from '@/components/vendas/UploadFotos'
import UploadDocumento from '@/components/vendas/UploadDocumento'
import type { AnexoVenda } from '@/services/anexos'
import {
  salvarEntradaVeiculo,
  type DadosEntradaVeiculo,
  type DocumentoEntrada,
} from '@/services/entradaVeiculo'
import { Camera, Car, AlertCircle, Plus, X, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------
// Schema de validação
// ---------------------------------------------------------------
const numInt = (msg?: string) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number({ error: msg }).int()
  )

const schema = z.object({
  marca: z.string().min(1, 'Obrigatório'),
  modelo: z.string().min(1, 'Obrigatório'),
  versao: z.string().optional(),
  ano_fabricacao: numInt('Ano inválido').pipe(z.number().int().min(1950).max(2030, 'Ano inválido')),
  ano_modelo: numInt('Ano inválido').pipe(z.number().int().min(1950).max(2030, 'Ano inválido')),
  cor: z.string().min(1, 'Obrigatório'),
  placa: z.string().min(7, 'Placa inválida').max(8),
  quilometragem: numInt('Quilometragem inválida').pipe(z.number().int().min(0)),
  valor_venda: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().positive('Valor inválido')
  ),
  comprador_nome: z.string().min(1, 'Obrigatório'),
  comprador_cpf_cnpj: z.string().min(11, 'CPF/CNPJ inválido'),
  comprador_rg: z.string().optional(),
  comprador_nascimento: z.string().optional(),
  comprador_logradouro: z.string().min(1, 'Obrigatório'),
  comprador_numero: z.string().min(1, 'Obrigatório'),
  comprador_complemento: z.string().optional(),
  comprador_bairro: z.string().min(1, 'Obrigatório'),
  comprador_cidade: z.string().min(1, 'Obrigatório'),
  comprador_uf: z.string().length(2, 'Selecione o estado'),
  comprador_cep: z.string().min(8, 'CEP inválido'),
  comprador_telefone: z.string().min(10, 'Telefone inválido'),
  comprador_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]

const MIN_FOTOS = 5

// ---------------------------------------------------------------
// Tipos de pagamento — linhas dinâmicas
// ---------------------------------------------------------------
const METODOS = [
  { key: 'dinheiro',      label: 'Dinheiro' },
  { key: 'pix',           label: 'PIX' },
  { key: 'cartao',        label: 'Cartão' },
  { key: 'financiamento', label: 'Financiamento' },
  { key: 'promissoria',   label: 'Promissória' },
] as const

type ChaveMetodo = typeof METODOS[number]['key']

const LABEL_METODO: Record<ChaveMetodo, string> = {
  dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão',
  financiamento: 'Financiamento', promissoria: 'Promissória',
}

interface LinhaPagamento {
  id: string
  tipo: ChaveMetodo
  valor: string
  data: string
  // Financiamento
  banco: string
  parcelas: string
  valorParcela: string
  // Cartão
  parcelasCartao: string
  // Promissória
  parcelasPromissoria: string
  dataPrimeiroPagamento: string
}

function novaLinha(tipo: ChaveMetodo = 'dinheiro'): LinhaPagamento {
  return {
    id: crypto.randomUUID(),
    tipo, valor: '', data: '', banco: '', parcelas: '', valorParcela: '',
    parcelasCartao: '', parcelasPromissoria: '', dataPrimeiroPagamento: '',
  }
}

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ---------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
        {titulo}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

interface CampoProps {
  label: string
  erro?: string
  colSpan?: 'full' | 'half'
  children: React.ReactNode
}

function Campo({ label, erro, colSpan = 'half', children }: CampoProps) {
  return (
    <div className={colSpan === 'full' ? 'col-span-2' : ''}>
      <Label className="text-xs font-medium text-gray-700 mb-1 block">{label}</Label>
      {children}
      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
    </div>
  )
}

// ---------------------------------------------------------------
// Linha de pagamento individual
// ---------------------------------------------------------------
interface ItemPagamentoProps {
  linha: LinhaPagamento
  temFinanciamento: boolean
  podRemover: boolean
  onChange: (campos: Partial<LinhaPagamento>) => void
  onRemover: () => void
}

function ItemPagamento({ linha, temFinanciamento, podRemover, onChange, onRemover }: ItemPagamentoProps) {
  const extraFinanciamento = linha.tipo === 'financiamento'
  const extraCartao        = linha.tipo === 'cartao'
  const extraPromissoria   = linha.tipo === 'promissoria'

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/40 overflow-hidden">
      {/* Linha principal */}
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 p-3 items-end">
        {/* Tipo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
          <Select
            value={linha.tipo}
            onValueChange={(v) => onChange({ tipo: v as ChaveMetodo })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS.map((m) => (
                <SelectItem
                  key={m.key}
                  value={m.key}
                  disabled={m.key === 'financiamento' && temFinanciamento && linha.tipo !== 'financiamento'}
                >
                  {m.label}
                  {m.key === 'financiamento' && temFinanciamento && linha.tipo !== 'financiamento'
                    ? ' (já adicionado)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Valor */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0,00"
            className="h-9 text-sm"
            value={linha.valor}
            onChange={(e) => onChange({ valor: e.target.value })}
          />
        </div>

        {/* Data */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data do pagamento</label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={linha.data}
            onChange={(e) => onChange({ data: e.target.value })}
          />
        </div>

        {/* Remover */}
        <div className="pb-0.5">
          <button
            type="button"
            onClick={onRemover}
            disabled={!podRemover}
            className="h-9 w-9 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Remover"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Campos extras — Financiamento */}
      {extraFinanciamento && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Banco / Financeira</label>
            <Select
              value={linha.banco}
              onValueChange={(v) => onChange({ banco: v ?? '' })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {['Santander', 'BV', 'Safra', 'Itaú', 'Carbank', 'Pan', 'Bradesco', 'C6', 'Stellants', 'Daycoval', 'Omni'].map((banco) => (
                  <SelectItem key={banco} value={banco}>{banco}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
            <Input
              type="number"
              min={1}
              placeholder="36"
              className="h-9 text-sm"
              value={linha.parcelas}
              onChange={(e) => onChange({ parcelas: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Valor da Parcela (R$)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="1.500,00"
              className="h-9 text-sm"
              value={linha.valorParcela}
              onChange={(e) => onChange({ valorParcela: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data 1ª Parcela</label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={linha.dataPrimeiroPagamento}
              onChange={(e) => onChange({ dataPrimeiroPagamento: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Campos extras — Cartão */}
      {extraCartao && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
          <Select
            value={linha.parcelasCartao}
            onValueChange={(v) => onChange({ parcelasCartao: v ?? '' })}
          >
            <SelectTrigger className="h-9 text-sm w-40">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 21 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Campos extras — Promissória */}
      {extraPromissoria && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas (máx. 10x)</label>
            <Select
              value={linha.parcelasPromissoria}
              onValueChange={(v) => onChange({ parcelasPromissoria: v ?? '' })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data do 1º Pagamento</label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={linha.dataPrimeiroPagamento}
              onChange={(e) => onChange({ dataPrimeiroPagamento: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------
export default function NovaVenda() {
  useRequererPerfil(['vendedor'])

  const { usuario } = useAuthStore()
  const { carregar } = useVendasStore()
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [erroGlobal, setErroGlobal] = useState<string | null>(null)

  const [saleId] = useState(() => crypto.randomUUID())

  // Linhas de pagamento
  const [linhas, setLinhas] = useState<LinhaPagamento[]>([novaLinha()])
  const [erroMetodos, setErroMetodos] = useState<string | null>(null)

  // Fotos
  const [fotos, setFotos] = useState<AnexoVenda[]>([])

  // CEP
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [erroCep, setErroCep]         = useState<string | null>(null)

  async function buscarCep(valor: string) {
    const cep = valor.replace(/\D/g, '')
    if (cep.length !== 8) { setErroCep(null); return }
    setBuscandoCep(true)
    setErroCep(null)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (data.erro) { setErroCep('CEP não encontrado.'); return }
      setValue('comprador_logradouro', data.logradouro ?? '', { shouldValidate: true })
      setValue('comprador_bairro',     data.bairro     ?? '', { shouldValidate: true })
      setValue('comprador_cidade',     data.localidade ?? '', { shouldValidate: true })
      setValue('comprador_uf',         data.uf         ?? '', { shouldValidate: true })
    } catch {
      setErroCep('Não foi possível consultar o CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  // Transferência e IPVA
  const [tipoTransferencia, setTipoTransferencia] = useState<'cortesia' | 'cobrada' | null>(null)
  const [valorTransferencia, setValorTransferencia] = useState('')
  const [ipvaInfo, setIpvaInfo] = useState('')

  // Veículo de entrada
  const [temEntrada, setTemEntrada] = useState<boolean | null>(null)
  const [dadosEntrada, setDadosEntrada] = useState<Partial<DadosEntradaVeiculo>>({})
  const [documentosEntrada, setDocumentosEntrada] = useState<DocumentoEntrada[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) as Resolver<FormData> })

  // Helpers de linha
  const temFinanciamento = linhas.some((l) => l.tipo === 'financiamento')

  function adicionarLinha() {
    const tipoSugerido: ChaveMetodo = temFinanciamento ? 'pix' : 'dinheiro'
    setLinhas((prev) => [...prev, novaLinha(tipoSugerido)])
  }

  function removerLinha(id: string) {
    setLinhas((prev) => prev.filter((l) => l.id !== id))
  }

  function atualizarLinha(id: string, campos: Partial<LinhaPagamento>) {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, ...campos } : l)))
  }

  async function enviar(dados: FormData) {
    if (!usuario?.id) return

    if (linhas.length === 0) {
      setErroMetodos('Adicione pelo menos uma forma de pagamento.')
      document.getElementById('secao-pagamento')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const totalPagamento = linhas.reduce((acc, l) => acc + (Number(l.valor) || 0), 0)
    const valorEntrada   = temEntrada ? (dadosEntrada.valor_estimado ?? 0) : 0
    const totalComEntrada = totalPagamento + valorEntrada

    if (Math.abs(totalComEntrada - dados.valor_venda) > 0.01) {
      const detalhe = valorEntrada > 0
        ? `pagamentos (${formatarMoeda(totalPagamento)}) + entrada (${formatarMoeda(valorEntrada)}) = ${formatarMoeda(totalComEntrada)}`
        : `soma dos pagamentos (${formatarMoeda(totalPagamento)})`
      setErroMetodos(`${detalhe} não corresponde ao valor da venda (${formatarMoeda(dados.valor_venda)}).`)
      document.getElementById('secao-pagamento')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setErroMetodos(null)

    if (fotos.length < MIN_FOTOS) {
      setErroGlobal(`Adicione pelo menos ${MIN_FOTOS} fotos do veículo antes de registrar.`)
      document.getElementById('secao-fotos')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const formasPagamentoJson = linhas.map((l) => ({
      tipo: l.tipo,
      valor: Number(l.valor),
      data: l.data || undefined,
      ...(l.tipo === 'financiamento' ? {
        banco: l.banco || undefined,
        numero_parcelas: l.parcelas ? Number(l.parcelas) : undefined,
        valor_parcela:   l.valorParcela ? Number(l.valorParcela) : undefined,
        data_primeiro_pagamento: l.dataPrimeiroPagamento || undefined,
      } : {}),
      ...(l.tipo === 'cartao' ? {
        numero_parcelas: l.parcelasCartao ? Number(l.parcelasCartao) : undefined,
      } : {}),
      ...(l.tipo === 'promissoria' ? {
        numero_parcelas: l.parcelasPromissoria ? Number(l.parcelasPromissoria) : undefined,
        data_primeiro_pagamento: l.dataPrimeiroPagamento || undefined,
      } : {}),
    }))

    const tiposUnicos = [...new Set(linhas.map((l) => LABEL_METODO[l.tipo]))]
    const formaPagamentoResumo = tiposUnicos.join(' + ')

    setEnviando(true)
    setErroGlobal(null)

    try {
      const transferenciaInfo =
        tipoTransferencia === 'cortesia' ? 'Cortesia' :
        tipoTransferencia === 'cobrada' && valorTransferencia ? valorTransferencia :
        undefined

      await criarVenda(
        {
          ...dados,
          versao:                   dados.versao || undefined,
          comprador_rg:             dados.comprador_rg || undefined,
          comprador_nascimento:     dados.comprador_nascimento || undefined,
          comprador_complemento:    dados.comprador_complemento || undefined,
          comprador_email:          dados.comprador_email || undefined,
          forma_pagamento:          formaPagamentoResumo,
          formas_pagamento_json:    formasPagamentoJson,
          observacoes:              dados.observacoes || undefined,
          transferencia_info:       transferenciaInfo,
          ipva_info:                ipvaInfo || undefined,
        },
        usuario.id,
        saleId
      )

      await salvarFotosNoBanco(fotos)
      if (documentosEntrada.length) await salvarDocumentosNoBanco(documentosEntrada)

      if (temEntrada && dadosEntrada.marca && dadosEntrada.modelo && dadosEntrada.placa) {
        await salvarEntradaVeiculo(saleId, dadosEntrada as DadosEntradaVeiculo)
      }

      await carregar(usuario.id)
      navigate('/vendedor')
    } catch {
      setErroGlobal('Erro ao registrar a venda. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  // Calculadora ao vivo
  const totalPagamento   = linhas.reduce((acc, l) => acc + (Number(l.valor) || 0), 0)
  const valorEntradaCalc = temEntrada ? (dadosEntrada.valor_estimado ?? 0) : 0
  const totalComEntrada  = totalPagamento + valorEntradaCalc
  const valorVenda       = Number(watch('valor_venda')) || 0
  const confere = valorVenda > 0 && Math.abs(totalComEntrada - valorVenda) <= 0.01
  const diverge = valorVenda > 0 && totalComEntrada > 0 && !confere

  return (
    <div className="flex flex-col flex-1">
      <Header titulo="Nova Venda" subtitulo="Resumo de Vendas" />

      <form onSubmit={handleSubmit(enviar)} className="flex-1 p-4 md:p-6 space-y-4 max-w-4xl">

        {/* Dados do Veículo */}
        <Secao titulo="Dados do Veículo">
          <Campo label="Marca *" erro={errors.marca?.message}>
            <Input {...register('marca')} placeholder="Ex: Toyota" />
          </Campo>
          <Campo label="Modelo *" erro={errors.modelo?.message}>
            <Input {...register('modelo')} placeholder="Ex: Corolla" />
          </Campo>
          <Campo label="Versão" erro={errors.versao?.message}>
            <Input {...register('versao')} placeholder="Ex: XEi 2.0" />
          </Campo>
          <Campo label="Cor *" erro={errors.cor?.message}>
            <Input {...register('cor')} placeholder="Ex: Prata" />
          </Campo>
          <Campo label="Ano Fabricação *" erro={errors.ano_fabricacao?.message}>
            <Input {...register('ano_fabricacao')} type="number" placeholder="2020" />
          </Campo>
          <Campo label="Ano Modelo *" erro={errors.ano_modelo?.message}>
            <Input {...register('ano_modelo')} type="number" placeholder="2021" />
          </Campo>
          <Campo label="Placa *" erro={errors.placa?.message}>
            <Input {...register('placa')} placeholder="ABC1234" className="uppercase" />
          </Campo>
          <Campo label="Quilometragem *" erro={errors.quilometragem?.message}>
            <Input {...register('quilometragem')} type="number" placeholder="45000" />
          </Campo>
          <Campo label="Valor de Venda (R$) *" erro={errors.valor_venda?.message}>
            <Input {...register('valor_venda')} type="number" step="0.01" placeholder="45000.00" />
          </Campo>
        </Secao>

        {/* Fotos do Veículo */}
        <div id="secao-fotos" className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Camera size={15} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-900">Fotos do Veículo *</h2>
            </div>
            {fotos.length > 0 && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                fotos.length >= MIN_FOTOS ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {fotos.length}/{MIN_FOTOS} mínimo
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Mínimo de {MIN_FOTOS} fotos do veículo. Ficam disponíveis para todos os setores.
          </p>
          <UploadFotos saleId={saleId} fotos={fotos} onChange={setFotos} />
        </div>

        {/* Dados do Comprador */}
        <Secao titulo="Dados do Comprador">
          <Campo label="Nome completo *" erro={errors.comprador_nome?.message} colSpan="full">
            <Input {...register('comprador_nome')} placeholder="Nome do comprador" />
          </Campo>
          <Campo label="CPF / CNPJ *" erro={errors.comprador_cpf_cnpj?.message}>
            <Input {...register('comprador_cpf_cnpj')} placeholder="000.000.000-00" />
          </Campo>
          <Campo label="RG" erro={errors.comprador_rg?.message}>
            <Input {...register('comprador_rg')} placeholder="0000000" />
          </Campo>
          <Campo label="Data de Nascimento" erro={errors.comprador_nascimento?.message}>
            <Input {...register('comprador_nascimento')} type="date" />
          </Campo>
          <Campo label="Telefone *" erro={errors.comprador_telefone?.message}>
            <Input {...register('comprador_telefone')} placeholder="(81) 99999-9999" />
          </Campo>
          <Campo label="E-mail" erro={errors.comprador_email?.message} colSpan="full">
            <Input {...register('comprador_email')} type="email" placeholder="email@exemplo.com" />
          </Campo>
          <Campo label="CEP *" erro={errors.comprador_cep?.message ?? erroCep ?? undefined}>
            <div className="relative">
              <Input
                {...register('comprador_cep')}
                placeholder="00000-000"
                maxLength={9}
                onChange={(e) => {
                  register('comprador_cep').onChange(e)
                  buscarCep(e.target.value)
                }}
              />
              {buscandoCep && (
                <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
              )}
            </div>
          </Campo>
          <Campo label="Logradouro *" erro={errors.comprador_logradouro?.message}>
            <Input {...register('comprador_logradouro')} placeholder="Rua / Av." />
          </Campo>
          <Campo label="Número *" erro={errors.comprador_numero?.message}>
            <Input {...register('comprador_numero')} placeholder="123" />
          </Campo>
          <Campo label="Complemento" erro={errors.comprador_complemento?.message}>
            <Input {...register('comprador_complemento')} placeholder="Apto, Bloco..." />
          </Campo>
          <Campo label="Bairro *" erro={errors.comprador_bairro?.message}>
            <Input {...register('comprador_bairro')} placeholder="Bairro" />
          </Campo>
          <Campo label="Cidade *" erro={errors.comprador_cidade?.message}>
            <Input {...register('comprador_cidade')} placeholder="Cidade" />
          </Campo>
          <Campo label="Estado *" erro={errors.comprador_uf?.message}>
            <Select
              value={watch('comprador_uf') ?? ''}
              onValueChange={(v) => setValue('comprador_uf', v ?? '', { shouldValidate: true })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </Campo>
        </Secao>

        {/* ── Dados da Negociação ── */}
        <div id="secao-pagamento" className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
            Dados da Negociação
          </h2>

          <div className="space-y-2">
            {linhas.map((linha) => (
              <ItemPagamento
                key={linha.id}
                linha={linha}
                temFinanciamento={temFinanciamento}
                podRemover={linhas.length > 1}
                onChange={(campos) => atualizarLinha(linha.id, campos)}
                onRemover={() => removerLinha(linha.id)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={adicionarLinha}
            className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <Plus size={15} />
            Adicionar forma de pagamento
          </button>

          {/* Calculadora */}
          {(linhas.length > 0 || valorEntradaCalc > 0) && (
            <div className={`mt-4 rounded-lg px-4 py-3 border text-sm ${
              confere ? 'bg-green-50 border-green-200' :
              diverge ? 'bg-red-50 border-red-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              {linhas.map((l, i) => (
                <div key={l.id} className="flex justify-between items-center text-gray-500 text-xs mb-1">
                  <span>
                    {LABEL_METODO[l.tipo]}
                    {l.data ? ` · ${l.data.split('-').reverse().join('/')}` : ''}
                    {linhas.filter((x) => x.tipo === l.tipo).length > 1 ? ` #${i + 1}` : ''}
                    :
                  </span>
                  <span>{formatarMoeda(Number(l.valor) || 0)}</span>
                </div>
              ))}
              {valorEntradaCalc > 0 && (
                <div className="flex justify-between items-center text-blue-600 text-xs mb-1">
                  <span>Veículo de entrada:</span>
                  <span>{formatarMoeda(valorEntradaCalc)}</span>
                </div>
              )}
              <div className={`flex justify-between items-center pt-1.5 border-t mt-1 ${
                confere ? 'border-green-200' : diverge ? 'border-red-200' : 'border-gray-200'
              }`}>
                <span className="text-gray-600 font-medium">Total:</span>
                <span className={`font-semibold ${
                  confere ? 'text-green-700' : diverge ? 'text-red-700' : 'text-gray-700'
                }`}>
                  {formatarMoeda(totalComEntrada)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-600">Valor da venda:</span>
                <span className="font-semibold text-gray-700">{formatarMoeda(valorVenda)}</span>
              </div>
              {confere && <p className="text-green-700 font-medium mt-2 text-xs">✓ Valores conferem</p>}
              {diverge && (
                <p className="text-red-700 font-medium mt-2 text-xs">
                  ✗ Diferença de {formatarMoeda(Math.abs(totalComEntrada - valorVenda))}
                </p>
              )}
            </div>
          )}

          {erroMetodos && (
            <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              <AlertCircle size={14} />
              {erroMetodos}
            </div>
          )}
        </div>

        {/* Transferência e IPVA */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
            Transferência e IPVA
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Transferência */}
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-2 block">Transferência</Label>
              <div className="flex gap-2">
                {(['cortesia', 'cobrada'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setTipoTransferencia(tipoTransferencia === v ? null : v)
                      setValorTransferencia('')
                    }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      tipoTransferencia === v
                        ? 'bg-[#1E40AF] border-[#1E40AF] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {v === 'cortesia' ? 'Cortesia' : 'Cobrada'}
                  </button>
                ))}
              </div>
              {tipoTransferencia === 'cobrada' && (
                <div className="mt-2">
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">Valor cobrado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={valorTransferencia}
                    onChange={(e) => setValorTransferencia(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* IPVA */}
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-2 block">IPVA</Label>
              <Input
                placeholder="Ex: incluso total, parcial 6/12, em aberto..."
                value={ipvaInfo}
                onChange={(e) => setIpvaInfo(e.target.value)}
                maxLength={120}
              />
            </div>

          </div>
        </div>

        {/* Veículo de Entrada */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Car size={15} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Veículo de Entrada (Troca)</h2>
          </div>

          <p className="text-xs text-gray-500 mb-3">Há veículo sendo ofertado como entrada?</p>
          <div className="flex gap-3 mb-4">
            {([false, true] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setTemEntrada(val)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  temEntrada === val
                    ? 'bg-[#1E40AF] border-[#1E40AF] text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {val ? 'Sim' : 'Não'}
              </button>
            ))}
          </div>

          {temEntrada && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Marca *</Label>
                  <Input placeholder="Ex: Fiat" value={dadosEntrada.marca ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, marca: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Modelo *</Label>
                  <Input placeholder="Ex: Uno" value={dadosEntrada.modelo ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, modelo: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Versão</Label>
                  <Input placeholder="Ex: Way 1.0" value={dadosEntrada.versao ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, versao: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Cor</Label>
                  <Input placeholder="Ex: Branca" value={dadosEntrada.cor ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, cor: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Ano Fabricação</Label>
                  <Input type="number" placeholder="2018" value={dadosEntrada.ano_fabricacao ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, ano_fabricacao: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Ano Modelo</Label>
                  <Input type="number" placeholder="2019" value={dadosEntrada.ano_modelo ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, ano_modelo: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Placa *</Label>
                  <Input placeholder="ABC1234" className="uppercase" value={dadosEntrada.placa ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, placa: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Quilometragem</Label>
                  <Input type="number" placeholder="85000" value={dadosEntrada.quilometragem ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, quilometragem: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Valor Estimado (R$)</Label>
                  <Input type="number" step="0.01" placeholder="25000.00" value={dadosEntrada.valor_estimado ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, valor_estimado: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Nome do Proprietário</Label>
                  <Input placeholder="Nome completo" value={dadosEntrada.proprietario_nome ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, proprietario_nome: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Observações</Label>
                  <Input placeholder="Condições do veículo, detalhes relevantes..." value={dadosEntrada.observacoes ?? ''}
                    onChange={(e) => setDadosEntrada((p) => ({ ...p, observacoes: e.target.value }))} />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documentos</p>
                <UploadDocumento
                  saleId={saleId}
                  tipo="crlv_entrada"
                  label="CRLV — Certificado de Registro e Licenciamento do Veículo"
                  documentos={documentosEntrada}
                  onChange={setDocumentosEntrada}
                />
                <UploadDocumento
                  saleId={saleId}
                  tipo="cnh_rg_entrada"
                  label="CNH ou RG do Proprietário"
                  documentos={documentosEntrada}
                  onChange={setDocumentosEntrada}
                />
              </div>
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
            Observações
          </h2>
          <Textarea
            {...register('observacoes')}
            placeholder="Informações adicionais sobre a venda..."
            rows={3}
          />
        </div>

        {erroGlobal && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            <AlertCircle size={15} />
            {erroGlobal}
          </div>
        )}

        <div className="flex items-center gap-3 pb-8">
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Registrando...' : 'Registrar Venda'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/vendedor')} disabled={enviando}>
            Cancelar
          </Button>
          {fotos.length < MIN_FOTOS && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle size={12} />
              {MIN_FOTOS - fotos.length} foto{MIN_FOTOS - fotos.length > 1 ? 's' : ''} ainda necessária{MIN_FOTOS - fotos.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
