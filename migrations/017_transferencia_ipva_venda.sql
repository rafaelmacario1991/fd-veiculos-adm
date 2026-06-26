ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS transferencia_info text,
  ADD COLUMN IF NOT EXISTS ipva_info text;
