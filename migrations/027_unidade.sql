-- Adiciona campo unidade (FD Veículos / FD Motos) para separar as divisões comerciais

ALTER TABLE users ADD COLUMN IF NOT EXISTS unidade text DEFAULT 'fd_veiculos';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS unidade text NOT NULL DEFAULT 'fd_veiculos';

-- RPC para supervisor alterar a unidade de um usuário vendedor
CREATE OR REPLACE FUNCTION atualizar_unidade_usuario(
  p_user_id  uuid,
  p_unidade  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE users SET unidade = p_unidade WHERE id = p_user_id;
END;
$$;
