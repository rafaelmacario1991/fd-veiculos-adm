-- Migration 004: anexo nas tarefas + bucket de documentos

-- Adiciona colunas de anexo na tabela tarefas
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS anexo_path text;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS anexo_nome text;

-- Bucket para documentos das tarefas
INSERT INTO storage.buckets (id, name, public)
VALUES ('tarefas-docs', 'tarefas-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage para tarefas-docs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tarefas_docs_insert' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    EXECUTE 'CREATE POLICY "tarefas_docs_insert" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = ''tarefas-docs'' AND auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tarefas_docs_select' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    EXECUTE 'CREATE POLICY "tarefas_docs_select" ON storage.objects
      FOR SELECT USING (bucket_id = ''tarefas-docs'' AND auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tarefas_docs_delete' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    EXECUTE 'CREATE POLICY "tarefas_docs_delete" ON storage.objects
      FOR DELETE USING (bucket_id = ''tarefas-docs'' AND auth.uid() IS NOT NULL)';
  END IF;
END $$;
