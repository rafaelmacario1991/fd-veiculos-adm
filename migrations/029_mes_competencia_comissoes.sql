-- Adiciona coluna mes_competencia (YYYY-MM) na tabela comissoes
ALTER TABLE comissoes
  ADD COLUMN IF NOT EXISTS mes_competencia TEXT;

-- Preenche registros existentes com o mês extraído de criado_em
UPDATE comissoes
SET mes_competencia = TO_CHAR(criado_em AT TIME ZONE 'America/Recife', 'YYYY-MM')
WHERE mes_competencia IS NULL;

-- Define como NOT NULL com padrão = mês atual
ALTER TABLE comissoes
  ALTER COLUMN mes_competencia SET DEFAULT TO_CHAR(NOW() AT TIME ZONE 'America/Recife', 'YYYY-MM'),
  ALTER COLUMN mes_competencia SET NOT NULL;

-- Índice para acelerar filtragem por vendedor + mês
CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor_mes
  ON comissoes (vendedor_id, mes_competencia);
