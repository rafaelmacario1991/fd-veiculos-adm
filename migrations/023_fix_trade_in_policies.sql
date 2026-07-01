-- Migration 023: permite que supervisor insira/atualize veículo de entrada
DROP POLICY IF EXISTS "trade_in_inserir"   ON trade_in_vehicles;
DROP POLICY IF EXISTS "trade_in_atualizar" ON trade_in_vehicles;

CREATE POLICY "trade_in_inserir" ON trade_in_vehicles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM sales WHERE id = trade_in_vehicles.sale_id AND vendedor_id = auth.uid())
    OR eh_supervisor()
  );

CREATE POLICY "trade_in_atualizar" ON trade_in_vehicles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM sales WHERE id = trade_in_vehicles.sale_id AND vendedor_id = auth.uid())
    OR eh_supervisor()
  );
