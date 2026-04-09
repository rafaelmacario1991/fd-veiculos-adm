-- Bucket avatares (já criado via dashboard)
-- Garante que a coluna avatar_url existe na tabela users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;

-- Remove políticas antigas
DROP POLICY IF EXISTS "atualizar_avatar" ON storage.objects;
DROP POLICY IF EXISTS "deletar_avatar" ON storage.objects;
DROP POLICY IF EXISTS "leitura_avatar" ON storage.objects;
DROP POLICY IF EXISTS "inserir_avatar" ON storage.objects;

-- INSERT: usuário autenticado pode enviar arquivo cujo nome começa com seu próprio ID
CREATE POLICY "inserir_avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatares'
    AND name LIKE (auth.uid()::text || '.%')
  );

-- UPDATE
CREATE POLICY "atualizar_avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatares'
    AND name LIKE (auth.uid()::text || '.%')
  );

-- DELETE
CREATE POLICY "deletar_avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatares'
    AND name LIKE (auth.uid()::text || '.%')
  );

-- SELECT: público
CREATE POLICY "leitura_avatar"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatares');
