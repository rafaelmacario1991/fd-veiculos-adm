CREATE POLICY "sales_supervisor_excluir"
  ON sales FOR DELETE
  USING (eh_supervisor());

CREATE POLICY "sector_activities_supervisor_excluir"
  ON sector_activities FOR DELETE
  USING (eh_supervisor());

CREATE POLICY "seller_pendencies_supervisor_excluir"
  ON seller_pendencies FOR DELETE
  USING (eh_supervisor());
