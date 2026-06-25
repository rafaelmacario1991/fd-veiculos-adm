import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import fdLogo from '@/assets/fd-logo.png'

const esquema = z.object({
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmar: z.string(),
}).refine((d) => d.senha === d.confirmar, {
  message: 'As senhas não conferem',
  path: ['confirmar'],
})

type Dados = z.infer<typeof esquema>

export default function NovaSenha() {
  const navigate = useNavigate()
  const [pronto, setPronto] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<Dados>({
    resolver: zodResolver(esquema),
  })

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') {
        setPronto(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function salvar(dados: Dados) {
    setErro(null)
    setCarregando(true)

    const { error } = await supabase.auth.updateUser({ password: dados.senha })

    setCarregando(false)

    if (error) {
      setErro('Não foi possível redefinir a senha. O link pode ter expirado.')
      return
    }

    setSalvo(true)
    setTimeout(() => navigate('/login', { replace: true }), 3000)
  }

  if (salvo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h2 className="text-lg font-semibold text-gray-900">Senha redefinida!</h2>
          <p className="text-sm text-gray-500 mt-2">Redirecionando para o login...</p>
        </div>
      </div>
    )
  }

  if (!pronto) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Validando link de recuperação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-20 w-20 rounded-2xl mb-4 shadow-md overflow-hidden">
            <img src={fdLogo} alt="FD Veículos" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Nova senha</h1>
          <p className="text-sm text-gray-500 mt-1">Escolha uma nova senha para sua conta</p>
        </div>

        <form onSubmit={handleSubmit(salvar)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova senha
            </label>
            <input
              {...register('senha')}
              type="password"
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••"
            />
            {errors.senha && (
              <p className="text-xs text-red-600 mt-1">{errors.senha.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar senha
            </label>
            <input
              {...register('confirmar')}
              type="password"
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••"
            />
            {errors.confirmar && (
              <p className="text-xs text-red-600 mt-1">{errors.confirmar.message}</p>
            )}
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {erro}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </form>
      </div>
    </div>
  )
}
