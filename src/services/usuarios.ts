import { supabase } from './supabase'
import type { Perfil, Usuario } from '@/types'

export interface UsuarioComPerfis extends Usuario {
  user_roles: { perfil: Perfil }[]
}

export async function listarUsuarios(): Promise<UsuarioComPerfis[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*, user_roles(perfil)')
    .order('nome')

  if (error) throw error
  return (data ?? []) as UsuarioComPerfis[]
}

export async function criarUsuario(
  nome: string,
  email: string,
  senha: string,
  perfis: Perfil[]
): Promise<string> {
  const { data, error } = await supabase.rpc('criar_usuario', {
    p_nome: nome,
    p_email: email,
    p_senha: senha,
    p_perfis: perfis,
  })

  if (error) throw error
  return data as string
}

export async function atualizarPerfis(userId: string, perfis: Perfil[]): Promise<void> {
  const { error } = await supabase.rpc('atualizar_perfis_usuario', {
    p_user_id: userId,
    p_perfis: perfis,
  })

  if (error) throw error
}

export async function alternarAtivo(userId: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.rpc('alternar_ativo_usuario', {
    p_user_id: userId,
    p_ativo: ativo,
  })

  if (error) throw error
}

export async function alterarDadosUsuario(userId: string, nome: string): Promise<void> {
  const { error } = await supabase.rpc('alterar_dados_usuario', {
    p_user_id: userId,
    p_nome: nome,
  })
  if (error) throw error
}

export async function alterarSenhaUsuario(userId: string, novaSenha: string): Promise<void> {
  const { error } = await supabase.rpc('alterar_senha_usuario', {
    p_user_id: userId,
    p_nova_senha: novaSenha,
  })
  if (error) throw error
}

export async function excluirUsuario(userId: string): Promise<void> {
  const { error } = await supabase.rpc('excluir_usuario', {
    p_user_id: userId,
  })
  if (error) throw error
}

export async function atualizarUnidade(userId: string, unidade: string): Promise<void> {
  const { error } = await supabase.rpc('atualizar_unidade_usuario', {
    p_user_id: userId,
    p_unidade: unidade,
  })
  if (error) throw error
}
