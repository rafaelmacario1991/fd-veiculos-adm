import { supabase } from './supabase'

export interface DebitoEntrada {
  descricao: string
  valor: number
}

export interface DadosEntradaVeiculo {
  marca: string
  modelo: string
  versao?: string
  ano_fabricacao: number
  ano_modelo: number
  cor: string
  placa: string
  renavam?: string
  chassi?: string
  quilometragem?: number
  valor_estimado?: number
  proprietario_nome?: string
  proprietario_cpf?: string
  observacoes?: string
  debitos?: DebitoEntrada[]
}

export interface EntradaVeiculo extends DadosEntradaVeiculo {
  id: string
  sale_id: string
  posicao: number
  criado_em: string
}

export interface DocumentoEntrada {
  id: string
  sale_id: string
  tipo: string
  storage_path: string
  url: string
  nome_arquivo: string
  criado_em: string
}

// Salva múltiplos veículos de entrada: deleta os existentes e re-insere todos.
export async function salvarEntradasVeiculo(
  saleId: string,
  veiculos: Array<{ dados: DadosEntradaVeiculo; debitos: DebitoEntrada[]; posicao: number }>
): Promise<void> {
  const { error: delError } = await supabase
    .from('trade_in_vehicles')
    .delete()
    .eq('sale_id', saleId)
  if (delError) throw delError

  if (veiculos.length === 0) return

  const { error } = await supabase
    .from('trade_in_vehicles')
    .insert(
      veiculos.map(({ dados, debitos, posicao }) => {
        const { debitos: _d, ...dadosResto } = dados
        return { sale_id: saleId, posicao, ...dadosResto, debitos_json: debitos }
      })
    )
  if (error) throw error
}

// Mantido por compatibilidade com código legado (upsert de 1 veículo).
export async function salvarEntradaVeiculo(
  saleId: string,
  dados: DadosEntradaVeiculo
): Promise<void> {
  const { debitos, ...resto } = dados
  await salvarEntradasVeiculo(saleId, [{ dados: resto as DadosEntradaVeiculo, debitos: debitos ?? [], posicao: 0 }])
}

// Retorna todos os veículos de entrada de uma venda, ordenados por posição.
export async function buscarEntradasVeiculo(saleId: string): Promise<EntradaVeiculo[]> {
  const { data, error } = await supabase
    .from('trade_in_vehicles')
    .select('*')
    .eq('sale_id', saleId)
    .order('posicao')
  if (error) throw error
  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>
    const { debitos_json, ...rest } = raw
    return { ...rest, debitos: (debitos_json ?? []) as DebitoEntrada[] } as EntradaVeiculo
  })
}

// Mantido por compatibilidade — retorna apenas o primeiro veículo.
export async function buscarEntradaVeiculo(saleId: string): Promise<EntradaVeiculo | null> {
  const entries = await buscarEntradasVeiculo(saleId)
  return entries[0] ?? null
}

// Retorna todos os documentos de entrada de uma venda (todos os veículos).
export async function listarDocumentosEntrada(saleId: string): Promise<DocumentoEntrada[]> {
  const { data, error } = await supabase
    .from('sale_attachments')
    .select('*')
    .eq('sale_id', saleId)
    .or('tipo.like.crlv_entrada%,tipo.like.cnh_rg_entrada%')
    .order('criado_em')
  if (error) throw error
  return (data ?? []) as DocumentoEntrada[]
}

export async function uploadDocumentoEntrada(
  saleId: string,
  tipo: string,
  arquivo: File
): Promise<DocumentoEntrada> {
  const ext = arquivo.name.split('.').pop()
  const path = `${saleId}/${tipo}-${Date.now()}.${ext}`

  const { error: errUpload } = await supabase.storage
    .from('documentos-entrada')
    .upload(path, arquivo, { upsert: false })

  if (errUpload) throw errUpload

  const { data: { publicUrl } } = supabase.storage
    .from('documentos-entrada')
    .getPublicUrl(path)

  return {
    id: crypto.randomUUID(),
    sale_id: saleId,
    tipo,
    storage_path: path,
    url: publicUrl,
    nome_arquivo: arquivo.name,
    criado_em: new Date().toISOString(),
  }
}

export async function salvarDocumentosNoBanco(docs: DocumentoEntrada[]): Promise<void> {
  if (!docs.length) return
  const { error } = await supabase.from('sale_attachments').insert(
    docs.map((d) => ({
      id: d.id,
      sale_id: d.sale_id,
      tipo: d.tipo,
      storage_path: d.storage_path,
      url: d.url,
      nome_arquivo: d.nome_arquivo,
    }))
  )
  if (error) throw error
}

// Retorna documentos CNH/RG do comprador (cnh_rg_comprador)
export async function listarDocumentosComprador(saleId: string): Promise<DocumentoEntrada[]> {
  const { data, error } = await supabase
    .from('sale_attachments')
    .select('*')
    .eq('sale_id', saleId)
    .eq('tipo', 'cnh_rg_comprador')
    .order('criado_em')
  if (error) throw error
  return (data ?? []) as DocumentoEntrada[]
}

// Retorna comprovantes de pagamento (comprovante_pix / comprovante_cartao)
export async function listarComprovantes(saleId: string): Promise<DocumentoEntrada[]> {
  const { data, error } = await supabase
    .from('sale_attachments')
    .select('*')
    .eq('sale_id', saleId)
    .or('tipo.eq.comprovante_pix,tipo.eq.comprovante_cartao')
    .order('criado_em')
  if (error) throw error
  return (data ?? []) as DocumentoEntrada[]
}

export async function deletarDocumentoTemp(doc: DocumentoEntrada): Promise<void> {
  await supabase.storage.from('documentos-entrada').remove([doc.storage_path])
}

export async function deletarDocumentoEntrada(doc: DocumentoEntrada): Promise<void> {
  await supabase.storage.from('documentos-entrada').remove([doc.storage_path])
  const { error } = await supabase.from('sale_attachments').delete().eq('id', doc.id)
  if (error) throw error
}
