import { supabase } from './supabase'
import type { Tarefa } from '@/types'

export interface DadosNovaTarefa {
  titulo: string
  descricao?: string
  setor_responsavel?: string
  usuario_responsavel_id?: string
  sale_id?: string
  prazo: string
  anexo_path?: string
  anexo_nome?: string
}

export async function uploadAnexoTarefa(tarefaId: string, arquivo: File): Promise<{ path: string; nome: string }> {
  const ext = arquivo.name.split('.').pop() ?? 'bin'
  const path = `${tarefaId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('tarefas-docs').upload(path, arquivo, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error

  return { path, nome: arquivo.name }
}

export function urlAnexoTarefa(path: string): string {
  const { data } = supabase.storage.from('tarefas-docs').getPublicUrl(path)
  return data.publicUrl
}

export async function urlAssinadaAnexo(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('tarefas-docs')
    .createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function listarTarefas(setor?: string): Promise<Tarefa[]> {
  let query = supabase
    .from('tarefas')
    .select(`
      *,
      criado_por:users!criado_por_id(id, nome),
      responsavel:users!usuario_responsavel_id(id, nome),
      concluido_por:users!concluido_por_id(id, nome)
    `)
    .order('prazo', { ascending: true })

  if (setor) query = query.eq('setor_responsavel', setor)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Tarefa[]
}

export async function adiarTarefa(tarefaId: string, novoPrazo: string): Promise<void> {
  const { error } = await supabase
    .from('tarefas')
    .update({ prazo: novoPrazo })
    .eq('id', tarefaId)
  if (error) throw error
}

export async function criarTarefa(dados: DadosNovaTarefa, criadoPorId: string): Promise<Tarefa> {
  const { data, error } = await supabase
    .from('tarefas')
    .insert({ ...dados, criado_por_id: criadoPorId })
    .select()
    .single()

  if (error) throw error
  return data as Tarefa
}

export async function concluirTarefa(tarefaId: string, usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from('tarefas')
    .update({
      status: 'concluida',
      concluido_em: new Date().toISOString(),
      concluido_por_id: usuarioId,
    })
    .eq('id', tarefaId)

  if (error) throw error
}

export async function reabrirTarefa(tarefaId: string): Promise<void> {
  const { error } = await supabase
    .from('tarefas')
    .update({ status: 'aberta', concluido_em: null, concluido_por_id: null })
    .eq('id', tarefaId)

  if (error) throw error
}

export async function deletarTarefa(tarefaId: string): Promise<void> {
  const { error } = await supabase
    .from('tarefas')
    .delete()
    .eq('id', tarefaId)

  if (error) throw error
}
