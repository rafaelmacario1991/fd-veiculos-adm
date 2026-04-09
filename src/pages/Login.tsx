import { useState } from 'react'
import fdLogo from '@/assets/fd-logo.png'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Perfil, Usuario } from '@/types'
import { Button } from '@/components/ui/button'

const esquemaLogin = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type DadosLogin = z.infer<typeof esquemaLogin>

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

export default function Login() {
  const navigate = useNavigate()
  const { definirUsuario } = useAuthStore()
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<DadosLogin>({
    resolver: zodResolver(esquemaLogin),
  })

  async function entrar(dados: DadosLogin) {
    setErro(null)
    setCarregando(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: dados.email,
      password: dados.senha,
    })

    if (error) {
      const mensagem = error.status === 500
        ? 'Erro interno do servidor. Tente novamente.'
        : 'E-mail ou senha inválidos.'
      setErro(mensagem)
      setCarregando(false)
      return
    }

    // Busca perfis antes de navegar — evita race condition com o Layout
    if (data.user) {
      const usuario = await buscarDadosUsuario(data.user.id)
      definirUsuario(usuario)
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-20 w-20 rounded-2xl mb-4 shadow-md overflow-hidden">
            <img src={fdLogo} alt="FD Veículos" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">FD Veículos</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Gestão Interna</p>
        </div>

        <form onSubmit={handleSubmit(entrar)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              {...register('senha')}
              type="password"
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••"
            />
            {errors.senha && (
              <p className="text-xs text-red-600 mt-1">{errors.senha.message}</p>
            )}
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {erro}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
