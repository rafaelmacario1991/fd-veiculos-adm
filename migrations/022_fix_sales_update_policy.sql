-- Migration 022: permite que o vendedor atualize a própria venda (se não concluída)
-- Antes só supervisor e contratos podiam atualizar — vendedor ficava bloqueado na edição.
DROP POLICY IF EXISTS "sales_atualizar" ON sales;

CREATE POLICY "sales_atualizar" ON sales FOR UPDATE
  USING (
    eh_supervisor()
    OR tem_perfil('contratos')
    OR (vendedor_id = auth.uid() AND status::text <> 'concluida')
  );
