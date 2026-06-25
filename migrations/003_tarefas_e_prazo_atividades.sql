-- Migration 003: tarefas e prazo em sector_activities
-- Aplica prazo padrão de 24h nas atividades dos setores
-- e cria tabela de tarefas manuais por setor

-- Adiciona coluna prazo em sector_activities
ALTER TABLE sector_activities
  ADD COLUMN IF NOT EXISTS prazo timestamptz;

-- Retrocompatibilidade: preenche registros existentes
UPDATE sector_activities
  SET prazo = criado_em + interval '24 hours'
  WHERE prazo IS NULL;

-- Define default para novos registros
ALTER TABLE sector_activities
  ALTER COLUMN prazo SET DEFAULT now() + interval '24 hours';

-- ============================================================
-- Tabela de tarefas manuais
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo                  text NOT NULL,
  descricao               text,
  setor_responsavel       text,
  usuario_responsavel_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  criado_por_id           uuid NOT NULL REFERENCES users(id),
  sale_id                 uuid REFERENCES sales(id) ON DELETE SET NULL,
  prazo                   timestamptz NOT NULL,
  status                  text NOT NULL DEFAULT 'aberta'
                            CHECK (status IN ('aberta', 'concluida')),
  criado_em               timestamptz NOT NULL DEFAULT now(),
  concluido_em            timestamptz,
  concluido_por_id        uuid REFERENCES users(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- Supervisor e setor responsável podem ver as tarefas
CREATE POLICY "tarefas_select" ON tarefas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.perfil = 'supervisor'
          OR ur.perfil = setor_responsavel
        )
    )
    OR criado_por_id = auth.uid()
    OR usuario_responsavel_id = auth.uid()
  );

-- Qualquer usuário autenticado pode criar tarefas
CREATE POLICY "tarefas_insert" ON tarefas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Criador, responsável ou supervisor podem atualizar
CREATE POLICY "tarefas_update" ON tarefas
  FOR UPDATE USING (
    criado_por_id = auth.uid()
    OR usuario_responsavel_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.perfil = 'supervisor'
    )
  );

-- Apenas criador ou supervisor podem deletar
CREATE POLICY "tarefas_delete" ON tarefas
  FOR DELETE USING (
    criado_por_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.perfil = 'supervisor'
    )
  );
