-- Permite múltiplos veículos de entrada por venda
-- Remove o UNIQUE(sale_id) e adiciona coluna de ordenação

ALTER TABLE trade_in_vehicles
  DROP CONSTRAINT IF EXISTS trade_in_vehicles_sale_id_key;

ALTER TABLE trade_in_vehicles
  ADD COLUMN IF NOT EXISTS posicao int DEFAULT 0;
