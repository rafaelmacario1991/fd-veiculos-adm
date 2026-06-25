import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import fdLogo from '@/assets/fd-logo.png'

const esquema = z.object({
  email: z.string().email('E-mail inválido'),
})

type Dados = z.infer<typeof esquema>

export default function EsqueciSenha() {
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<Dados>({
    resolver: zodResolver(esquema),
  })

  async function enviar(dados: Dados) {
    setErro(null)
    setCarregando(true)

    const { error } = await supabase.auth.resetPasswordForEmail(dados.email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })

    setCarregando(false)

    if (error) {
      setErro('Não foi possível enviar o e-mail. Tente novamente.')
      return
    }

    setEnviado(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-20 w-20 rounded-2xl mb-4 shadow-md overflow-hidden">
            <img src={fdLogo} alt="FD Veículos" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Recuperar senha</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Informe seu e-mail para receber o link de redefinição
          </p>
        </div>

        {enviado ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg text-center">
              <p className="font-medium">E-mail enviado!</p>
              <p className="mt-1">Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
            </div>
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Voltar ao login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(enviar)} className="space-y-4">
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

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {erro}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-xs text-blue-600 hover:text-blue-800 hover:underline">
                Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
