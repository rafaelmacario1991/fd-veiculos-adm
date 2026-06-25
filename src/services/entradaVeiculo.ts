import { supabase } from './supabase'

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
  observacoes?: string
}

export interface EntradaVeiculo extends DadosEntradaVeiculo {
  id: string
  sale_id: string
  criado_em: string
}

export interface DocumentoEntrada {
  id: string
  sale_id: string
  tipo: 'crlv_entrada' | 'cnh_rg_entrada'
  storage_path: string
  url: string
  nome_arquivo: string
  criado_em: string
}

export async function salvarEntradaVeiculo(
  saleId: string,
  dados: DadosEntradaVeiculo
): Promise<void> {
  // Upsert — se já existir, atualiza
  const { error } = await supabase
    .from('trade_in_vehicles')
    .upsert({ sale_id: saleId, ...dados }, { onConflict: 'sale_id' })

  if (error) throw error
}

export async function buscarEntradaVeiculo(saleId: string): Promise<EntradaVeiculo | null> {
  const { data, error } = await supabase
    .from('trade_in_vehicles')
    .select('*')
    .eq('sale_id', saleId)
    .maybeSingle()

  if (error) throw error
  return data as EntradaVeiculo | null
}

export async function listarDocumentosEntrada(saleId: string): Promise<DocumentoEntrada[]> {
  const { data, error } = await supabase
    .from('sale_attachments')
    .select('*')
    .eq('sale_id', saleId)
    .in('tipo', ['crlv_entrada', 'cnh_rg_entrada'])
    .order('criado_em')

  if (error) throw error
  return (data ?? []) as DocumentoEntrada[]
}

// Faz upload apenas no storage — sem inserir no banco.
// Chamar salvarDocumentosNoBanco() após criarVenda() para persistir.
export async function uploadDocumentoEntrada(
  saleId: string,
  tipo: DocumentoEntrada['tipo'],
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
  } as DocumentoEntrada
}

// Persiste todos os documentos no banco após a venda ser criada.
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

// Remove do storage antes da venda ser salva (sem registro no banco).
export async function deletarDocumentoTemp(doc: DocumentoEntrada): Promise<void> {
  await supabase.storage.from('documentos-entrada').remove([doc.storage_path])
}

// Remove storage + registro no banco (após venda criada).
export async function deletarDocumentoEntrada(doc: DocumentoEntrada): Promise<void> {
  await supabase.storage.from('documentos-entrada').remove([doc.storage_path])
  const { error } = await supabase.from('sale_attachments').delete().eq('id', doc.id)
  if (error) throw error
}
