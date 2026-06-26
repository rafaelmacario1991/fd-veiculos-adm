-- 018: adiciona campo debitos_json na tabela de veículo de entrada (troca)
ALTER TABLE trade_in_vehicles
  ADD COLUMN IF NOT EXISTS debitos_json jsonb DEFAULT '[]'::jsonb;
