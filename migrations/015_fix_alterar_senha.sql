-- Migration 015: corrige alterar_senha_usuario — gen_salt/crypt estão em extensions no Supabase
-- O SET search_path = public da migration 014 excluía o schema extensions onde pgcrypto está instalado.

CREATE OR REPLACE FUNCTION public.alterar_senha_usuario(
  p_user_id    uuid,
  p_nova_senha text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt(p_nova_senha, extensions.gen_salt('bf')),
    updated_at         = now()
  WHERE id = p_user_id;
END;
$$;
