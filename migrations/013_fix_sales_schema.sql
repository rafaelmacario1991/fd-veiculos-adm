-- Migration 013: Corrigir schema da tabela sales
-- 1. forma_pagamento: ENUM → text (suporta múltiplos métodos livres)
-- 2. renavam e chassi: NOT NULL → nullable (não coletados no formulário)

ALTER TABLE sales
  ALTER COLUMN renavam DROP NOT NULL,
  ALTER COLUMN chassi  DROP NOT NULL;

ALTER TABLE sales
  ALTER COLUMN forma_pagamento TYPE text USING forma_pagamento::text;

DROP TYPE IF EXISTS forma_pagamento;
