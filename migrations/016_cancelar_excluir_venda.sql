-- Migration 016: função para excluir venda e todos os dados vinculados

CREATE OR REPLACE FUNCTION public.excluir_venda(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications_log    WHERE sale_id = p_sale_id;
  DELETE FROM public.transfer_processes   WHERE sale_id = p_sale_id;
  DELETE FROM public.pendencies           WHERE sale_id = p_sale_id;
  DELETE FROM public.sector_activities    WHERE sale_id = p_sale_id;
  DELETE FROM public.seller_pendencies    WHERE sale_id = p_sale_id;
  DELETE FROM public.sale_attachments     WHERE sale_id = p_sale_id;
  DELETE FROM public.sales                WHERE id      = p_sale_id;
END;
$$;
