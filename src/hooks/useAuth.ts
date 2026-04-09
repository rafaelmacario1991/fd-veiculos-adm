import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Perfil, Usuario } from '@/types'

export function useAuth() {
  const { usuario, carregando, definirUsuario, definirCarregando, temPerfil, sair } =
    useAuthStore()

  useEffect(() => {
    // Se o Supabase não estiver configurado, sai imediatamente
    if (!import.meta.env.VITE_SUPABASE_URL) {
      definirUsuario(null)
      definirCarregando(false)
      return
    }

    // Timeout de segurança — evita travamento em caso de rede lenta ou URL inválida
    const timeout = setTimeout(() => {
      definirUsuario(null)
      definirCarregando(false)
    }, 8000)

    // Carrega sessão inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) {
        const dados = await buscarDadosUsuario(session.user.id)
        definirUsuario(dados)
      } else {
        definirUsuario(null)
      }
      definirCarregando(false)
    }).catch(() => {
      clearTimeout(timeout)
      definirUsuario(null)
      definirCarregando(false)
    })

    // Escuta mudanças de autenticação (logout, expiração de token, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_evento, session) => {
        if (!session?.user) {
          definirUsuario(null)
        }
        // Login é tratado diretamente em Login.tsx para evitar race condition
      }
    )

    return () => subscription.unsubscribe()
  }, [definirUsuario, definirCarregando])

  return { usuario, carregando, temPerfil, sair }
}

async function buscarDadosUsuario(userId: string): Promise<Usuario | null> {
  try {
    const { data: perfil } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!perfil) return null

    const { data: papeis } = await supabase
      .from('user_roles')
      .select('perfil')
      .eq('user_id', userId)

    const perfis = (papeis ?? []).map((p) => p.perfil as Perfil)

    return { ...perfil, perfis }
  } catch {
    return null
  }
}

// Hook para proteger rotas por perfil
export function useRequererPerfil(perfis: Perfil[]) {
  const { usuario, carregando, temPerfil } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (carregando) return
    if (!usuario) {
      navigate('/login')
      return
    }
    const temAcesso = perfis.some((p) => temPerfil(p))
    if (!temAcesso) {
      navigate('/dashboard')
    }
  }, [carregando, usuario, perfis, temPerfil, navigate])
}
