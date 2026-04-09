import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Perfil, Usuario } from '@/types'

interface EstadoAuth {
  usuario: Usuario | null
  carregando: boolean
  definirUsuario: (usuario: Usuario | null) => void
  definirCarregando: (carregando: boolean) => void
  temPerfil: (perfil: Perfil) => boolean
  perfis: Perfil[]
  sair: () => void
}

export const useAuthStore = create<EstadoAuth>()(
  persist(
    (set, get) => ({
      usuario: null,
      carregando: true,
      perfis: [],

      definirUsuario: (usuario) =>
        set({ usuario, perfis: usuario?.perfis ?? [] }),

      definirCarregando: (carregando) => set({ carregando }),

      temPerfil: (perfil) => {
        const { usuario } = get()
        return usuario?.perfis.includes(perfil) ?? false
      },

      sair: () => set({ usuario: null, perfis: [] }),
    }),
    {
      name: 'fd-veiculos-auth',
      partialize: (state) => ({ usuario: state.usuario, perfis: state.perfis }),
    }
  )
)
