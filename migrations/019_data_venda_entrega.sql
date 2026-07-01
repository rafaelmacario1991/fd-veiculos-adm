-- Migration 019: campos data_venda e data_prevista_entrega
-- data_venda: data real da venda (pode diferir de criado_em)
-- data_prevista_entrega: previsão de entrega do veículo ao comprador

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS data_venda date,
  ADD COLUMN IF NOT EXISTS data_prevista_entrega date;

-- Backfill: registros existentes usam a data de criação como data da venda
UPDATE sales
SET data_venda = criado_em::date
WHERE data_venda IS NULL;
