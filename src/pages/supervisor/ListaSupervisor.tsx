import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useRequererPerfil } from '@/hooks/useAuth'
import {
  listarTodasVendas,
  listarPendenciasVendedor,
  listarPendenciasVencidas,
  listarPendenciasAprovacao,
  listarAtividadesSetor,
  type VendaCompleta,
  type PendenciaDetalhe,
  type AtividadeDetalhe,
  type PendenciaComVenda,
} from '@/services/supervisor'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TITULOS: Record<string, string> = {
  vendas: 'Vendas',
  pendencias: 'Pendências do Vendedor',
  vencidas: 'Pendências Vencidas',
  aprovacao: 'Aguardando Aprovação',
  setor: 'Atividades do Setor',
}

const NOMES_SETOR: Record<string, string> = {
  contratos: 'Contratos',
  financeiro: 'Financeiro',
  fiscal: 'Fiscal',
  transferencia: 'Transferência',
}

export default function ListaSupervisor() {
  useRequererPerfil(['supervisor'])
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const tipo = params.get('tipo') ?? 'vendas'
  const de = params.get('de') ?? ''
  const ate = params.get('ate') ?? ''
  const setor = params.get('setor') ?? ''

  const [vendas, setVendas] = useState<VendaCompleta[]>([])
  const [pendencias, setPendencias] = useState<PendenciaDetalhe[]>([])
  const [aprovacoes, setAprovacoes] = useState<PendenciaComVenda[]>([])
  const [atividades, setAtividades] = useState<AtividadeDetalhe[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      try {
        if (tipo === 'vendas') {
          const data = await listarTodasVendas(de, ate)
          setVendas(data)
        } else if (tipo === 'pendencias') {
          const data = await listarPendenciasVendedor(de, ate, 'aberta')
          setPendencias(data)
        } else if (tipo === 'vencidas') {
          const data = await listarPendenciasVencidas()
          setPendencias(data)
        } else if (tipo === 'aprovacao') {
          const data = await listarPendenciasAprovacao()
          setAprovacoes(data)
        } else if (tipo === 'setor' && setor) {
          const data = await listarAtividadesSetor(setor, de, ate)
          setAtividades(data)
        }
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [tipo, de, ate, setor])

  const titulo = tipo === 'setor' && setor
    ? `Setor de ${NOMES_SETOR[setor] ?? setor}`
    : TITULOS[tipo] ?? 'Lista'

  const subtitulo = de && ate ? `${formatarData(de)} até ${formatarData(ate)}` : undefined

  return (
    <div className="flex flex-col flex-1">
      <Header
        titulo={titulo}
        subtitulo={subtitulo}
        acoes={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} className="mr-1.5" /> Voltar
          </Button>
        }
      />

      <div className="flex-1 p-6">
        {carregando && <p className="text-gray-400 text-sm">Carregando...</p>}

        {!carregando && tipo === 'vendas' && <TabelaVendas vendas={vendas} />}
        {!carregando && (tipo === 'pendencias' || tipo === 'vencidas') && <TabelaPendencias pendencias={pendencias} />}
        {!carregando && tipo === 'aprovacao' && <TabelaAprovacoes aprovacoes={aprovacoes} />}
        {!carregando && tipo === 'setor' && <TabelaAtividades atividades={atividades} setor={setor} />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Tabela de Vendas
// ---------------------------------------------------------------

function TabelaVendas({ vendas }: { vendas: VendaCompleta[] }) {
  const total = vendas.reduce((s, v) => s + Number(v.valor_venda), 0)

  return (
    <div className="space-y-3">
      {vendas.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-gray-500">{vendas.length} vendas</span>
          <span className="font-semibold text-gray-900">
            Total: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Setores</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-12 text-sm">
                  Nenhuma venda no período
                </TableCell>
              </TableRow>
            )}
            {vendas.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="text-sm font-medium">
                  {v.marca} {v.modelo} {v.ano_modelo}
                  <span className="text-xs text-gray-400 font-mono ml-1.5 uppercase">{v.placa}</span>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{v.comprador_nome}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {(v.users as { nome: string } | null)?.nome ?? '—'}
                </TableCell>
                <TableCell className="text-sm font-medium text-gray-900">
                  {Number(v.valor_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {['contratos', 'financeiro', 'fiscal', 'transferencia'].map((s) => {
                      const atv = v.sector_activities.find((a) => a.setor === s)
                      return (
                        <span key={s} title={s}
                          className={`inline-flex items-center justify-center w-6 h-5 rounded text-[9px] font-bold
                            ${atv?.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s.slice(0, 2).toUpperCase()}
                        </span>
                      )
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <BadgeVenda status={v.status} />
                </TableCell>
                <TableCell className="text-xs text-gray-400">
                  {new Date(v.criado_em).toLocaleDateString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Tabela de Pendências
// ---------------------------------------------------------------

function TabelaPendencias({ pendencias }: { pendencias: PendenciaDetalhe[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead>Comprador</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendencias.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-400 py-12 text-sm">
                Nenhuma pendência encontrada
              </TableCell>
            </TableRow>
          )}
          {pendencias.map((p) => {
            const venda = p.sales as unknown as { marca: string; modelo: string; placa: string; comprador_nome: string }
            const usuario = p.users as unknown as { nome: string }
            const vencida = new Date(p.prazo) < new Date() && p.status === 'aberta'
            return (
              <TableRow key={p.id}>
                <TableCell className="text-sm font-medium">
                  {p.tipo === 'vistoria' ? 'Vistoria' : 'Firma / GOV.BR'}
                </TableCell>
                <TableCell className="text-sm text-gray-600">{usuario?.nome ?? '—'}</TableCell>
                <TableCell className="text-sm">
                  {venda?.marca} {venda?.modelo}
                  <span className="text-xs text-gray-400 font-mono ml-1 uppercase">{venda?.placa}</span>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{venda?.comprador_nome}</TableCell>
                <TableCell className={`text-sm ${vencida ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                  {vencida && <AlertTriangle size={12} className="inline mr-1" />}
                  {new Date(p.prazo).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell><BadgePendencia status={p.status} /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ---------------------------------------------------------------
// Tabela de Aprovações pendentes
// ---------------------------------------------------------------

function TabelaAprovacoes({ aprovacoes }: { aprovacoes: PendenciaComVenda[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead>Concluído em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aprovacoes.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-400 py-12 text-sm">
                Nenhuma pendência aguardando aprovação
              </TableCell>
            </TableRow>
          )}
          {aprovacoes.map((p) => {
            const venda = p.sales as unknown as { marca: string; modelo: string; placa: string }
            const usuario = p.users as unknown as { nome: string }
            return (
              <TableRow key={p.id}>
                <TableCell className="text-sm font-medium">
                  {p.tipo === 'vistoria' ? 'Vistoria' : 'Firma / GOV.BR'}
                </TableCell>
                <TableCell className="text-sm text-gray-600">{usuario?.nome ?? '—'}</TableCell>
                <TableCell className="text-sm">
                  {venda?.marca} {venda?.modelo}
                  <span className="text-xs text-gray-400 font-mono ml-1 uppercase">{venda?.placa}</span>
                </TableCell>
                <TableCell className="text-sm text-gray-400">
                  {p.concluido_em ? new Date(p.concluido_em).toLocaleDateString('pt-BR') : '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ---------------------------------------------------------------
// Tabela de Atividades do Setor
// ---------------------------------------------------------------

function TabelaAtividades({ atividades, setor }: { atividades: AtividadeDetalhe[]; setor: string }) {
  const concluidas = atividades.filter((a) => a.status === 'concluida').length
  const pendentes = atividades.filter((a) => a.status === 'pendente').length

  return (
    <div className="space-y-3">
      {atividades.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 size={14} /> {concluidas} concluídas
          </span>
          <span className="flex items-center gap-1 text-amber-600">
            <Clock size={14} /> {pendentes} pendentes
          </span>
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Concluído em</TableHead>
              <TableHead>Registrado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {atividades.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-12 text-sm">
                  Nenhuma atividade no período para o setor {NOMES_SETOR[setor] ?? setor}
                </TableCell>
              </TableRow>
            )}
            {atividades.map((a) => {
              const venda = a.sales as unknown as {
                marca: string; modelo: string; placa: string
                comprador_nome: string; valor_venda: number; criado_em: string
                users: { nome: string } | null
              }
              return (
                <TableRow key={a.id}>
                  <TableCell className="text-sm font-medium">
                    {venda?.marca} {venda?.modelo}
                    <span className="text-xs text-gray-400 font-mono ml-1 uppercase">{venda?.placa}</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{venda?.comprador_nome ?? '—'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{venda?.users?.nome ?? '—'}</TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {venda?.valor_venda
                      ? Number(venda.valor_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs border-0 rounded-full ${a.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.status === 'concluida' ? 'Concluída' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">
                    {a.concluido_em ? new Date(a.concluido_em).toLocaleDateString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">
                    {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------

function BadgeVenda({ status }: { status: string }) {
  const c: Record<string, { label: string; className: string }> = {
    iniciada: { label: 'Iniciada', className: 'bg-gray-100 text-gray-600' },
    pendencia_vendedor: { label: 'Pendência', className: 'bg-amber-100 text-amber-700' },
    concluida: { label: 'Concluída', className: 'bg-green-100 text-green-700' },
  }
  const { label, className } = c[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return <Badge className={`text-xs border-0 rounded-full ${className}`}>{label}</Badge>
}

function BadgePendencia({ status }: { status: string }) {
  const c: Record<string, { label: string; className: string }> = {
    aberta: { label: 'Aberta', className: 'bg-amber-100 text-amber-700' },
    aguardando_aprovacao: { label: 'Ag. Aprovação', className: 'bg-blue-100 text-blue-700' },
    aprovada: { label: 'Aprovada', className: 'bg-green-100 text-green-700' },
  }
  const { label, className } = c[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return <Badge className={`text-xs border-0 rounded-full ${className}`}>{label}</Badge>
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}
