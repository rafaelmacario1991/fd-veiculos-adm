import { useEffect, useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Sidebar from './Sidebar'
import { useTheme } from '@/hooks/useTheme'

export default function Layout() {
  const { usuario, carregando } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const { tema, alternar } = useTheme()

  useEffect(() => {
    if (!carregando && !usuario) {
      navigate('/login', { replace: true })
    }
  }, [carregando, usuario, navigate])

  // Fecha sidebar ao navegar (mobile)
  function fecharSidebar() { setSidebarAberta(false) }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  if (!usuario) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Overlay escuro no mobile quando sidebar aberta */}
      {sidebarAberta && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={fecharSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        print-hidden
        fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out
        md:static md:translate-x-0 md:z-auto md:transition-none
        ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onNavegar={fecharSidebar} tema={tema} onAlternarTema={alternar} />
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Barra mobile com hamburger */}
        <div className="print-hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 md:hidden flex-shrink-0">
          <button
            onClick={() => setSidebarAberta(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menu"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="4" x2="16" y2="4" />
              <line x1="2" y1="9" x2="16" y2="9" />
              <line x1="2" y1="14" x2="16" y2="14" />
            </svg>
          </button>
          <img src="/fd-logo.png" alt="FD Veículos" className="h-7 w-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span className="text-sm font-semibold text-gray-900">FD Veículos</span>
        </div>

        <Outlet />
      </div>
    </div>
  )
}
