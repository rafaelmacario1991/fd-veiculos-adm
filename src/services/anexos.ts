import { supabase } from './supabase'

export interface AnexoVenda {
  id: string
  sale_id: string
  tipo: string
  storage_path: string
  url: string
  nome_arquivo: string
  criado_em: string
}

export async function listarAnexos(saleId: string): Promise<AnexoVenda[]> {
  const { data, error } = await supabase
    .from('sale_attachments')
    .select('*')
    .eq('sale_id', saleId)
    .eq('tipo', 'foto_veiculo')
    .order('criado_em')

  if (error) throw error
  return (data ?? []) as AnexoVenda[]
}

export async function uploadFoto(saleId: string, arquivo: File): Promise<AnexoVenda> {
  const ext = arquivo.name.split('.').pop()
  const path = `${saleId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: errUpload } = await supabase.storage
    .from('fotos-veiculos')
    .upload(path, arquivo, { upsert: false })

  if (errUpload) throw errUpload

  const { data: { publicUrl } } = supabase.storage
    .from('fotos-veiculos')
    .getPublicUrl(path)

  const { data, error } = await supabase
    .from('sale_attachments')
    .insert({
      sale_id: saleId,
      tipo: 'foto_veiculo',
      storage_path: path,
      url: publicUrl,
      nome_arquivo: arquivo.name,
    })
    .select()
    .single()

  if (error) throw error
  return data as AnexoVenda
}

export async function deletarFoto(anexo: AnexoVenda): Promise<void> {
  await supabase.storage.from('fotos-veiculos').remove([anexo.storage_path])
  const { error } = await supabase.from('sale_attachments').delete().eq('id', anexo.id)
  if (error) throw error
}
