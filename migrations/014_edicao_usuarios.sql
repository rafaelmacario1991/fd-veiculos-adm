-- Migration 014: funções de edição completa de usuários pelo supervisor

-- Extensão para hash de senha (já costuma estar ativa no Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atualiza nome do usuário na tabela pública
CREATE OR REPLACE FUNCTION public.alterar_dados_usuario(
  p_user_id uuid,
  p_nome    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET nome = p_nome
  WHERE id = p_user_id;
END;
$$;

-- Redefine a senha do usuário diretamente em auth.users
CREATE OR REPLACE FUNCTION public.alterar_senha_usuario(
  p_user_id    uuid,
  p_nova_senha text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET
    encrypted_password = crypt(p_nova_senha, gen_salt('bf')),
    updated_at         = now()
  WHERE id = p_user_id;
END;
$$;

-- Remove o usuário completamente (auth + tabelas públicas)
CREATE OR REPLACE FUNCTION public.excluir_usuario(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.users       WHERE id      = p_user_id;
  DELETE FROM auth.users         WHERE id      = p_user_id;
END;
$$;
