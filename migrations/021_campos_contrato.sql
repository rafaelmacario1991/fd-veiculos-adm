-- Campos adicionais para geração do contrato de venda
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nr_motor text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS combustivel text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS potencia text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tipo_veiculo text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS comprador_profissao text;

-- CPF do proprietário do veículo de entrada (pode diferir do comprador)
ALTER TABLE trade_in_vehicles ADD COLUMN IF NOT EXISTS proprietario_cpf text;
