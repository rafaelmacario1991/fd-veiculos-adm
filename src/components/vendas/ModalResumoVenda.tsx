import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { VendaListagem } from '@/services/vendas'
import { listarAnexos, type AnexoVenda } from '@/services/anexos'
import { buscarEntradasVeiculo, listarDocumentosEntrada, type EntradaVeiculo, type DocumentoEntrada } from '@/services/entradaVeiculo'
import { Car, User, DollarSign, FileText, Camera, ArrowLeftRight, FileCheck, BadgeInfo } from 'lucide-react'

interface Props {
  venda: VendaListagem | null
  onFechar: () => void
}

const METODO_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao: 'Cartão',
  financiamento: 'Financiamento',
  promissoria: 'Promissória',
}

function formatarData(d: string): string {
  const [ano, mes, dia] = d.split('-')
  return `${dia}/${mes}/${ano}`
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pl-8">
        {children}
      </div>
    </div>
  )
}

export default function ModalResumoVenda({ venda, onFechar }: Props) {
  const [fotos, setFotos] = useState<AnexoVenda[]>([])
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)
  const [entradas, setEntradas] = useState<EntradaVeiculo[]>([])
  const [docsEntrada, setDocsEntrada] = useState<DocumentoEntrada[]>([])

  useEffect(() => {
    if (!venda) { setFotos([]); setEntradas([]); setDocsEntrada([]); return }
    listarAnexos(venda.id).then(setFotos).catch(() => setFotos([]))
    buscarEntradasVeiculo(venda.id).then(setEntradas).catch(() => setEntradas([]))
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
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className="text-xs text-gray-400">
              Enviado em {new Date(venda.criado_em).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
            {venda.users?.nome && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Vendedor: {venda.users.nome}
              </span>
            )}
          </div>
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
          <Secao icone={<User size={13} />} titulo="Cliente">
            {venda.canal_venda && <Linha label="Canal de Venda" valor={venda.canal_venda} />}
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
            <div className="col-span-2">
              <Linha label="Valor da Venda" valor={moeda(venda.valor_venda)} />
            </div>
            <Linha
              label="Data da Venda"
              valor={venda.data_venda ? formatarData(venda.data_venda) : null}
            />
            <Linha
              label="Prev. de Entrega"
              valor={venda.data_prevista_entrega ? formatarData(venda.data_prevista_entrega) : null}
            />

            {/* Formas de pagamento (novo formato JSON) */}
            {venda.formas_pagamento_json && venda.formas_pagamento_json.length > 0 ? (
              <div className="col-span-2 space-y-2 mt-1">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                  Forma{venda.formas_pagamento_json.length > 1 ? 's' : ''} de Pagamento
                </span>
                {venda.formas_pagamento_json.map((m, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        {METODO_LABEL[m.tipo] ?? m.tipo}
                      </span>
                      <span className="text-sm font-bold text-gray-800">{moeda(m.valor)}</span>
                    </div>
                    <div className="space-y-0.5">
                      {m.data && (
                        <p className="text-xs text-gray-500">Data: {formatarData(m.data)}</p>
                      )}
                      {m.banco && (
                        <p className="text-xs text-gray-500">Banco / Financeira: <strong>{m.banco}</strong></p>
                      )}
                      {m.numero_parcelas != null && (
                        <p className="text-xs text-gray-500">
                          Parcelas: <strong>{m.numero_parcelas}x</strong>
                          {m.valor_parcela ? ` de ${moeda(m.valor_parcela)}` : ''}
                        </p>
                      )}
                      {m.data_primeiro_pagamento && (
                        <p className="text-xs text-gray-500">
                          1ª parcela: {formatarData(m.data_primeiro_pagamento)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback para vendas antigas (sem formas_pagamento_json) */
              <>
                <Linha label="Forma de Pagamento" valor={venda.forma_pagamento} />
                <Linha label="Banco / Financeira" valor={venda.banco_financeira} />
                <Linha label="Valor de Entrada" valor={moeda(venda.valor_entrada)} />
                <Linha label="Valor Financiado" valor={moeda(venda.valor_financiado)} />
                <Linha label="Parcelas" valor={venda.numero_parcelas ? `${venda.numero_parcelas}x` : null} />
              </>
            )}
          </Secao>

          {/* Transferência e IPVA */}
          {(venda.transferencia_info || venda.ipva_info) && (
            <>
              <hr className="border-gray-100" />
              <Secao icone={<BadgeInfo size={13} />} titulo="Transferência e IPVA">
                <Linha label="Transferência" valor={venda.transferencia_info} />
                <Linha label="IPVA" valor={venda.ipva_info} />
              </Secao>
            </>
          )}

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

          {/* Veículos de entrada */}
          {entradas.length > 0 && (
            <>
              <hr className="border-gray-100" />
              {entradas.map((entrada, idx) => {
                const sufixo = idx === 0 ? '' : `_${idx}`
                const docsVeiculo = docsEntrada.filter(
                  (d) => d.tipo === `crlv_entrada${sufixo}` || d.tipo === `cnh_rg_entrada${sufixo}`
                )
                const labelDocTipo = (tipo: string) => {
                  if (tipo.startsWith('crlv_entrada')) return 'CRLV'
                  if (tipo.startsWith('cnh_rg_entrada')) return 'CNH / RG'
                  return tipo
                }
                return (
                  <Secao
                    key={entrada.id ?? idx}
                    icone={<ArrowLeftRight size={13} />}
                    titulo={entradas.length > 1 ? `Veículo de Entrada ${idx + 1} (Troca)` : 'Veículo de Entrada (Troca)'}
                  >
                    <Linha label="Marca" valor={entrada.marca} />
                    <Linha label="Modelo" valor={entrada.modelo} />
                    <Linha label="Versão" valor={entrada.versao} />
                    <Linha label="Ano Fab / Modelo" valor={`${entrada.ano_fabricacao} / ${entrada.ano_modelo}`} />
                    <Linha label="Cor" valor={entrada.cor} />
                    <Linha label="Placa" valor={entrada.placa?.toUpperCase()} />
                    <Linha label="RENAVAM" valor={entrada.renavam} />
                    <Linha label="Chassi" valor={entrada.chassi} />
                    <Linha label="Quilometragem" valor={entrada.quilometragem ? `${entrada.quilometragem.toLocaleString('pt-BR')} km` : null} />
                    <Linha label="Valor Estimado (bruto)" valor={entrada.valor_estimado ? entrada.valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null} />

                    {entrada.debitos && entrada.debitos.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">Débitos do Veículo</span>
                        <div className="space-y-1">
                          {entrada.debitos.map((d, i) => (
                            <div key={i} className="flex justify-between text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2.5 py-1.5">
                              <span>{d.descricao || '—'}</span>
                              <span className="font-medium">− {d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-100 rounded px-2.5 py-1.5">
                            <span>Entrada líquida</span>
                            <span>
                              {((entrada.valor_estimado ?? 0) - entrada.debitos.reduce((acc, d) => acc + d.valor, 0))
                                .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <Linha label="Proprietário" valor={entrada.proprietario_nome} />
                    {entrada.observacoes && (
                      <div className="col-span-2">
                        <Linha label="Observações" valor={entrada.observacoes} />
                      </div>
                    )}

                    {docsVeiculo.length > 0 && (
                      <div className="col-span-2 mt-1">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Documentos Anexados</p>
                        <div className="space-y-1.5">
                          {docsVeiculo.map((doc) => (
                            <a
                              key={doc.id}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-blue-700 hover:underline"
                            >
                              <FileCheck size={13} className="text-green-600 flex-shrink-0" />
                              <span className="font-medium">{labelDocTipo(doc.tipo)}:</span>
                              {doc.nome_arquivo}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </Secao>
                )
              })}
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
