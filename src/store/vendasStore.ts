import { create } from 'zustand'
import type { VendaListagem } from '@/services/vendas'
import { listarVendasDoVendedor } from '@/services/vendas'

interface EstadoVendas {
  vendas: VendaListagem[]
  carregando: boolean
  erro: string | null
  carregar: (vendedorId: string) => Promise<void>
  adicionarVenda: (venda: VendaListagem) => void
  limpar: () => void
}

export const useVendasStore = create<EstadoVendas>((set) => ({
  vendas: [],
  carregando: false,
  erro: null,

  carregar: async (vendedorId) => {
    set({ carregando: true, erro: null })
    try {
      const vendas = await listarVendasDoVendedor(vendedorId)
      set({ vendas, carregando: false })
    } catch {
      set({ erro: 'Erro ao carregar vendas.', carregando: false })
    }
  },

  adicionarVenda: (venda) =>
    set((state) => ({ vendas: [venda, ...state.vendas] })),

  limpar: () => set({ vendas: [], erro: null }),
}))
