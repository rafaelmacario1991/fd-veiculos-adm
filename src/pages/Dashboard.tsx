import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Redireciona o usuário para o painel correto com base nos seus perfis.
// Supervisor tem prioridade. Caso tenha múltiplos perfis, vai para o painel principal.
export default function Dashboard() {
  const { usuario, carregando } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (carregando) return
    if (!usuario) {
      navigate('/login')
      return
    }

    const perfis = usuario.perfis

    if (perfis.length > 0) {
      navigate('/inicio', { replace: true })
    } else {
      // Sem perfis — aguarda configuração pelo supervisor
      navigate('/sem-acesso', { replace: true })
    }
  }, [carregando, usuario, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500 text-sm">Carregando...</p>
    </div>
  )
}
