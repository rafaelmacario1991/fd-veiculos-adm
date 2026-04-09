import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { VendaListagem } from '@/services/vendas'
import { listarAnexos, type AnexoVenda } from '@/services/anexos'
import { buscarEntradaVeiculo, listarDocumentosEntrada, type EntradaVeiculo, type DocumentoEntrada } from '@/services/entradaVeiculo'
import { Car, User, DollarSign, FileText, Camera, ArrowLeftRight, FileCheck } from 'lucide-react'

interface Props {
  venda: VendaListagem | null
  onFechar: () => void
}

const formaPagamentoLabel: Record<string, string> = {
  a_vista: 'À Vista',
  cartao: 'Cartão',
  financiamento: 'Financiamento',
}

function Linha({ label, valor }: { label: string; valor?: string | number | null }) {
  if (!valor && valor !== 0) return null
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 mt-0.5">{valor}</span>
    </div>
  )
}

function Secao({ icone, titulo, children }: { icone: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-blue-600">
          {icone}
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{titulo}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-8">
        {children}
      </div>
    </div>
  )
}

export default function ModalResumoVenda({ venda, onFechar }: Props) {
  const [fotos, setFotos] = useState<AnexoVenda[]>([])
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)
  const [entrada, setEntrada] = useState<EntradaVeiculo | null>(null)
  const [docsEntrada, setDocsEntrada] = useState<DocumentoEntrada[]>([])

  useEffect(() => {
    if (!venda) { setFotos([]); setEntrada(null); setDocsEntrada([]); return }
    listarAnexos(venda.id).then(setFotos).catch(() => setFotos([]))
    buscarEntradaVeiculo(venda.id).then(setEntrada).catch(() => setEntrada(null))
    listarDocumentosEntrada(venda.id).then(setDocsEntrada).catch(() => setDocsEntrada([]))
  }, [venda?.id])

  if (!venda) return null

  const moeda = (v: number | null | undefined) =>
    v != null
      ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null

  const enderecoCompleto = [
    venda.comprador_logradouro,
    venda.comprador_numero,
    venda.comprador_complemento,
    venda.comprador_bairro,
    `${venda.comprador_cidade}/${venda.comprador_uf}`,
    venda.comprador_cep,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Dialog open={!!venda} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Resumo de Venda — {venda.marca} {venda.modelo}
            <span className="ml-2 text-xs font-mono text-gray-400 uppercase">{venda.placa}</span>
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            Enviado em {new Date(venda.criado_em).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Veículo */}
          <Secao icone={<Car size={13} />} titulo="Veículo">
            <Linha label="Marca" valor={venda.marca} />
            <Linha label="Modelo" valor={venda.modelo} />
            <Linha label="Versão" valor={venda.versao} />
            <Linha label="Ano Fab / Modelo" valor={`${venda.ano_fabricacao} / ${venda.ano_modelo}`} />
            <Linha label="Cor" valor={venda.cor} />
            <Linha label="Quilometragem" valor={`${venda.quilometragem.toLocaleString('pt-BR')} km`} />
            <Linha label="Placa" valor={venda.placa.toUpperCase()} />
            <Linha label="RENAVAM" valor={venda.renavam} />
            <Linha label="Chassi" valor={venda.chassi} />
          </Secao>

          <hr className="border-gray-100" />

          {/* Comprador */}
          <Secao icone={<User size={13} />} titulo="Comprador">
            <Linha label="Nome" valor={venda.comprador_nome} />
            <Linha label="CPF / CNPJ" valor={venda.comprador_cpf_cnpj} />
            <Linha label="RG" valor={venda.comprador_rg} />
            <Linha
              label="Data de Nascimento"
              valor={
                venda.comprador_nascimento
                  ? new Date(venda.comprador_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')
                  : null
              }
            />
            <Linha label="Telefone" valor={venda.comprador_telefone} />
            <Linha label="E-mail" valor={venda.comprador_email} />
            <div className="col-span-2">
              <Linha label="Endereço" valor={enderecoCompleto} />
            </div>
          </Secao>

          <hr className="border-gray-100" />

          {/* Negociação */}
          <Secao icone={<DollarSign size={13} />} titulo="Negociação">
            <Linha label="Valor da Venda" valor={moeda(venda.valor_venda)} />
            <Linha label="Forma de Pagamento" valor={formaPagamentoLabel[venda.forma_pagamento] ?? venda.forma_pagamento} />
            {venda.forma_pagamento === 'financiamento' && (
              <>
                <Linha label="Banco / Financeira" valor={venda.banco_financeira} />
                <Linha label="Valor Entrada" valor={moeda(venda.valor_entrada)} />
                <Linha label="Valor Financiado" valor={moeda(venda.valor_financiado)} />
                <Linha label="Parcelas" valor={venda.numero_parcelas ? `${venda.numero_parcelas}x` : null} />
              </>
            )}
          </Secao>

          {/* Observações */}
          {venda.observacoes && (
            <>
              <hr className="border-gray-100" />
              <Secao icone={<FileText size={13} />} titulo="Observações">
                <div className="col-span-2">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{venda.observacoes}</p>
                </div>
              </Secao>
            </>
          )}

          {/* Veículo de entrada */}
          {entrada && (
            <>
              <hr className="border-gray-100" />
              <Secao icone={<ArrowLeftRight size={13} />} titulo="Veículo de Entrada (Troca)">
                <Linha label="Marca" valor={entrada.marca} />
                <Linha label="Modelo" valor={entrada.modelo} />
                <Linha label="Versão" valor={entrada.versao} />
                <Linha label="Ano Fab / Modelo" valor={`${entrada.ano_fabricacao} / ${entrada.ano_modelo}`} />
                <Linha label="Cor" valor={entrada.cor} />
                <Linha label="Placa" valor={entrada.placa?.toUpperCase()} />
                <Linha label="RENAVAM" valor={entrada.renavam} />
                <Linha label="Chassi" valor={entrada.chassi} />
                <Linha label="Quilometragem" valor={entrada.quilometragem ? `${entrada.quilometragem.toLocaleString('pt-BR')} km` : null} />
                <Linha label="Valor Estimado" valor={entrada.valor_estimado ? entrada.valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null} />
                <Linha label="Proprietário" valor={entrada.proprietario_nome} />
                {entrada.observacoes && (
                  <div className="col-span-2">
                    <Linha label="Observações" valor={entrada.observacoes} />
                  </div>
                )}

                {/* Documentos anexados */}
                {docsEntrada.length > 0 && (
                  <div className="col-span-2 mt-1">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Documentos Anexados</p>
                    <div className="space-y-1.5">
                      {docsEntrada.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-blue-700 hover:underline"
                        >
                          <FileCheck size={13} className="text-green-600 flex-shrink-0" />
                          <span className="font-medium">
                            {doc.tipo === 'crlv_entrada' ? 'CRLV' : 'CNH / RG'}:
                          </span>
                          {doc.nome_arquivo}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Secao>
            </>
          )}

          {/* Fotos do veículo */}
          <hr className="border-gray-100" />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                <Camera size={13} />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Fotos do Veículo
                <span className="ml-2 text-gray-400 normal-case font-normal">({fotos.length})</span>
              </p>
            </div>

            {fotos.length === 0 ? (
              <p className="text-sm text-gray-400 pl-8">Nenhuma foto adicionada.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pl-8">
                {fotos.map((foto) => (
                  <button
                    key={foto.id}
                    type="button"
                    onClick={() => setFotoAmpliada(foto.url)}
                    className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors"
                  >
                    <img src={foto.url} alt={foto.nome_arquivo} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Lightbox */}
      {fotoAmpliada && (
        <Dialog open onOpenChange={() => setFotoAmpliada(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black border-0">
            <img src={fotoAmpliada} alt="Foto ampliada" className="w-full h-auto rounded" />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
