-- Migra vendas históricas de Caio Rodrigo, Isaias Pedrosa e Paulo Cesar para FD Motos.
-- Esses vendedores já foram marcados como unidade='fd_motos' na tabela users.
-- Este script atualiza as vendas existentes criadas antes da coluna unidade existir.

UPDATE sales
SET unidade = 'fd_motos'
WHERE vendedor_id IN (
  SELECT id FROM users
  WHERE nome ILIKE '%caio%'
     OR nome ILIKE '%isaias%'
     OR nome ILIKE '%paulo%'
);
