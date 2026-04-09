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

  const { data, error } = await supabase
    .from('sale_attachments')
    .insert({
      sale_id: saleId,
      tipo,
      storage_path: path,
      url: publicUrl,
      nome_arquivo: arquivo.name,
    })
    .select()
    .single()

  if (error) throw error
  return data as DocumentoEntrada
}

export async function deletarDocumentoEntrada(doc: DocumentoEntrada): Promise<void> {
  await supabase.storage.from('documentos-entrada').remove([doc.storage_path])
  const { error } = await supabase.from('sale_attachments').delete().eq('id', doc.id)
  if (error) throw error
}
