-- Adiciona o valor 'cancelada' ao enum status_venda
ALTER TYPE status_venda ADD VALUE IF NOT EXISTS 'cancelada';
