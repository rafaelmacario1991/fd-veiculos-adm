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
import { Camera, Car, AlertCircle } from 'lucide-react'

// ---------------------------------------------------------------
// Schema de validação
// ---------------------------------------------------------------
const numInt = (msg?: string) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number({ error: msg }).int()
  )

const numOpcional = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
  z.number().positive().optional()
)

const schema = z.object({
  // Veículo
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
  // Comprador
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

const METODOS_PAGAMENTO = [
  { key: 'dinheiro',      label: 'Dinheiro' },
  { key: 'pix',           label: 'PIX' },
  { key: 'cartao',        label: 'Cartão' },
  { key: 'financiamento', label: 'Financiamento' },
  { key: 'promissoria',   label: 'Promissória' },
] as const

type ChaveMetodo = typeof METODOS_PAGAMENTO[number]['key']

interface EstadoMetodo {
  selecionado: boolean
  valor: string
  banco: string
  parcelas: string
  valorParcela: string
  parcelasPromissoria: string
  dataPrimeiroPagamento: string
}

const estadoMetodoInicial: EstadoMetodo = {
  selecionado: false, valor: '', banco: '', parcelas: '', valorParcela: '',
  parcelasPromissoria: '', dataPrimeiroPagamento: '',
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
// Página principal
// ---------------------------------------------------------------
export default function NovaVenda() {
  useRequererPerfil(['vendedor'])

  const { usuario } = useAuthStore()
  const { carregar } = useVendasStore()
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [erroGlobal, setErroGlobal] = useState<string | null>(null)

  // ID pré-gerado para uploads antes de criar a venda
  const [saleId] = useState(() => crypto.randomUUID())

  // Formas de pagamento
  const [metodos, setMetodos] = useState<Record<ChaveMetodo, EstadoMetodo>>({
    dinheiro:      { ...estadoMetodoInicial },
    pix:           { ...estadoMetodoInicial },
    cartao:        { ...estadoMetodoInicial },
    financiamento: { ...estadoMetodoInicial },
    promissoria:   { ...estadoMetodoInicial },
  })
  const [erroMetodos, setErroMetodos] = useState<string | null>(null)

  // Fotos do veículo vendido
  const [fotos, setFotos] = useState<AnexoVenda[]>([])

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

  async function enviar(dados: FormData) {
    if (!usuario?.id) return

    // Validar formas de pagamento
    const metodosSelecionados = METODOS_PAGAMENTO.filter(m => metodos[m.key].selecionado)
    if (metodosSelecionados.length === 0) {
      setErroMetodos('Selecione pelo menos uma forma de pagamento.')
      document.getElementById('secao-pagamento')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const totalPagamento = metodosSelecionados.reduce((acc, m) => acc + (Number(metodos[m.key].valor) || 0), 0)
    if (Math.abs(totalPagamento - dados.valor_venda) > 0.01) {
      setErroMetodos(`A soma dos pagamentos (${formatarMoeda(totalPagamento)}) não corresponde ao valor da venda (${formatarMoeda(dados.valor_venda)}).`)
      document.getElementById('secao-pagamento')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setErroMetodos(null)

    if (fotos.length < MIN_FOTOS) {
      setErroGlobal(`Adicione pelo menos ${MIN_FOTOS} fotos do veículo antes de registrar.`)
      document.getElementById('secao-fotos')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const formasPagamentoJson = metodosSelecionados.map(m => ({
      tipo: m.key,
      valor: Number(metodos[m.key].valor),
      ...(m.key === 'cartao' ? {
        numero_parcelas: metodos.cartao.parcelas ? Number(metodos.cartao.parcelas) : undefined,
      } : {}),
      ...(m.key === 'financiamento' ? {
        banco: metodos.financiamento.banco || undefined,
        numero_parcelas: metodos.financiamento.parcelas ? Number(metodos.financiamento.parcelas) : undefined,
        valor_parcela: metodos.financiamento.valorParcela ? Number(metodos.financiamento.valorParcela) : undefined,
      } : {}),
      ...(m.key === 'promissoria' ? {
        numero_parcelas: metodos.promissoria.parcelasPromissoria ? Number(metodos.promissoria.parcelasPromissoria) : undefined,
        data_primeiro_pagamento: metodos.promissoria.dataPrimeiroPagamento || undefined,
      } : {}),
    }))
    const formaPagamentoResumo = metodosSelecionados.map(m => m.label).join(' + ')

    setEnviando(true)
    setErroGlobal(null)

    try {
      await criarVenda(
        {
          ...dados,
          versao: dados.versao || undefined,
          comprador_rg: dados.comprador_rg || undefined,
          comprador_nascimento: dados.comprador_nascimento || undefined,
          comprador_complemento: dados.comprador_complemento || undefined,
          comprador_email: dados.comprador_email || undefined,
          forma_pagamento: formaPagamentoResumo,
          formas_pagamento_json: formasPagamentoJson,
          observacoes: dados.observacoes || undefined,
        },
        usuario.id,
        saleId
      )

      // Agora que a venda existe no banco, persistir os anexos
      await salvarFotosNoBanco(fotos)
      if (documentosEntrada.length) await salvarDocumentosNoBanco(documentosEntrada)

      // Salvar veículo de entrada se informado
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

          <Campo label="CEP *" erro={errors.comprador_cep?.message}>
            <Input {...register('comprador_cep')} placeholder="00000-000" />
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
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        </Secao>

        {/* Dados da Negociação */}
        <div id="secao-pagamento" className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
            Dados da Negociação
          </h2>

          <div className="space-y-3">
            {METODOS_PAGAMENTO.map((m) => {
              const estado = metodos[m.key]
              return (
                <div key={m.key} className={`rounded-lg border transition-colors ${estado.selecionado ? 'border-blue-200 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-900/20' : 'border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800'}`}>
                  {/* Linha do checkbox */}
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={estado.selecionado}
                      onChange={(e) => setMetodos(prev => ({
                        ...prev,
                        [m.key]: { ...prev[m.key], selecionado: e.target.checked, valor: e.target.checked ? prev[m.key].valor : '' }
                      }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{m.label}</span>
                  </label>

                  {/* Campos expandidos quando selecionado */}
                  {estado.selecionado && (
                    <div className="px-4 pb-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={estado.valor}
                          onChange={(e) => setMetodos(prev => ({ ...prev, [m.key]: { ...prev[m.key], valor: e.target.value } }))}
                        />
                      </div>

                      {m.key === 'financiamento' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Banco / Financeira</label>
                            <Input
                              placeholder="Ex: Banco do Brasil"
                              value={estado.banco}
                              onChange={(e) => setMetodos(prev => ({ ...prev, financiamento: { ...prev.financiamento, banco: e.target.value } }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
                            <Input
                              type="number"
                              placeholder="36"
                              value={estado.parcelas}
                              onChange={(e) => setMetodos(prev => ({ ...prev, financiamento: { ...prev.financiamento, parcelas: e.target.value } }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Valor da Parcela (R$)</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="1.500,00"
                              value={estado.valorParcela}
                              onChange={(e) => setMetodos(prev => ({ ...prev, financiamento: { ...prev.financiamento, valorParcela: e.target.value } }))}
                            />
                          </div>
                        </div>
                      )}

                      {m.key === 'cartao' && (
                        <div className="pt-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
                          <Select
                            value={estado.parcelas}
                            onValueChange={(v) => setMetodos(prev => ({ ...prev, cartao: { ...prev.cartao, parcelas: v } }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 21 }, (_, i) => i + 1).map(n => (
                                <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {m.key === 'promissoria' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas (máx. 10x)</label>
                            <Select
                              value={estado.parcelasPromissoria}
                              onValueChange={(v) => setMetodos(prev => ({ ...prev, promissoria: { ...prev.promissoria, parcelasPromissoria: v } }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                                  <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Data do 1º Pagamento</label>
                            <Input
                              type="date"
                              value={estado.dataPrimeiroPagamento}
                              onChange={(e) => setMetodos(prev => ({ ...prev, promissoria: { ...prev.promissoria, dataPrimeiroPagamento: e.target.value } }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Calculadora */}
          {(() => {
            const selecionados = METODOS_PAGAMENTO.filter(m => metodos[m.key].selecionado)
            if (selecionados.length === 0) return null
            const totalPagamento = selecionados.reduce((acc, m) => acc + (Number(metodos[m.key].valor) || 0), 0)
            const valorVenda = Number(watch('valor_venda')) || 0
            const confere = valorVenda > 0 && Math.abs(totalPagamento - valorVenda) <= 0.01
            const diverge = valorVenda > 0 && totalPagamento > 0 && !confere
            return (
              <div className={`mt-4 rounded-lg px-4 py-3 border text-sm ${confere ? 'bg-green-50 border-green-200' : diverge ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total informado:</span>
                  <span className={`font-semibold ${confere ? 'text-green-700' : diverge ? 'text-red-700' : 'text-gray-700'}`}>
                    {formatarMoeda(totalPagamento)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-600">Valor da venda:</span>
                  <span className="font-semibold text-gray-700">{formatarMoeda(valorVenda)}</span>
                </div>
                {confere && (
                  <p className="text-green-700 font-medium mt-2 text-xs">✓ Valores conferem</p>
                )}
                {diverge && (
                  <p className="text-red-700 font-medium mt-2 text-xs">
                    ✗ Diferença de {formatarMoeda(Math.abs(totalPagamento - valorVenda))}
                  </p>
                )}
              </div>
            )
          })()}

          {erroMetodos && (
            <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              <AlertCircle size={14} />
              {erroMetodos}
            </div>
          )}
        </div>

        {/* Veículo de Entrada */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Car size={15} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Veículo de Entrada (Troca)</h2>
          </div>

          {/* Seleção Sim / Não */}
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

              {/* Documentos do veículo de entrada */}
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

        {/* Erro global */}
        {erroGlobal && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            <AlertCircle size={15} />
            {erroGlobal}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-3 pb-8">
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Registrando...' : 'Registrar Venda'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/vendedor')}
            disabled={enviando}
          >
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
