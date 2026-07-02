-- Adiciona campo troco à tabela sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS troco numeric DEFAULT 0 NOT NULL;
