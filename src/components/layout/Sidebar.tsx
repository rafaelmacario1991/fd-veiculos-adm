import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/services/supabase'
import {
  Car, FileText, DollarSign, Receipt, Truck, Users, UserCog,
  LogOut, LayoutDashboard, PlusCircle, ShieldCheck, BarChart2,
  ChevronUp, Settings, X, Sun, Moon, House, Wallet,
} from 'lucide-react'
import ModalPerfil from './ModalPerfil'
import fdLogo from '@/assets/fd-logo.png'

interface ItemNav {
  label: string
  href: string
  icone: React.ReactNode
  badge?: number
}

interface SidebarProps {
  onNavegar?: () => void
  tema?: 'light' | 'dark'
  onAlternarTema?: () => void
}

export default function Sidebar({ onNavegar, tema, onAlternarTema }: SidebarProps) {
  const { usuario, sair } = useAuthStore()
  const navigate = useNavigate()
  const [qtdAprovacoes, setQtdAprovacoes] = useState(0)
  const [menuAberto, setMenuAberto] = useState(false)
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!usuario?.perfis.includes('supervisor')) return
    supabase
      .from('seller_pendencies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aguardando_aprovacao')
      .then(({ count }) => setQtdAprovacoes(count ?? 0))
  }, [usuario])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false)
      }
    }
    if (menuAberto) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuAberto])

  async function deslogar() {
    await supabase.auth.signOut()
    sair()
    navigate('/login')
  }

  function navegar() { onNavegar?.() }

  const perfis = usuario?.perfis ?? []

  const itensVendedor: ItemNav[] = [
    { label: 'Nova Venda', href: '/vendedor/nova-venda', icone: <PlusCircle size={16} /> },
    { label: 'Minhas Vendas', href: '/vendedor', icone: <Car size={16} /> },
    { label: 'Minhas Comissões', href: '/vendedor/comissoes', icone: <Wallet size={16} /> },
    ...(perfis.includes('supervisor')
      ? [{ label: 'Quadro de Vendas', href: '/supervisor/quadro-vendas', icone: <BarChart2 size={16} /> }]
      : []),
  ]

  const itensSetores: ItemNav[] = [
    perfis.includes('contratos') && { label: 'Contratos', href: '/setor/contratos', icone: <FileText size={16} /> },
    perfis.includes('financeiro') && { label: 'Financeiro', href: '/setor/financeiro', icone: <DollarSign size={16} /> },
    perfis.includes('fiscal') && { label: 'Fiscal', href: '/setor/fiscal', icone: <Receipt size={16} /> },
    perfis.includes('transferencia') && { label: 'Transferência', href: '/setor/transferencia', icone: <Truck size={16} /> },
  ].filter(Boolean) as ItemNav[]

  const itensSupervisor: ItemNav[] = [
    { label: 'Supervisão', href: '/supervisor', icone: <LayoutDashboard size={16} /> },
    {
      label: 'Aprovações',
      href: '/supervisor/aprovacoes',
      icone: <ShieldCheck size={16} />,
      badge: qtdAprovacoes > 0 ? qtdAprovacoes : undefined,
    },
    { label: 'Usuários', href: '/supervisor/usuarios', icone: <Users size={16} /> },
    { label: 'Despachantes', href: '/supervisor/despachantes', icone: <UserCog size={16} /> },
  ]

  const inicial = usuario?.nome?.charAt(0).toUpperCase() ?? '?'

  return (
    <>
      <aside className="w-60 h-full min-h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0 relative">

        {/* Cabeçalho com logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-[#1E40AF]">
              <img src={fdLogo} alt="FD Veículos" className="w-full h-full object-contain" />
            </div>
            <div className="leading-none">
              <p className="text-sm font-bold text-gray-900">FD Veículos</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Gestão Interna</p>
            </div>
          </div>
          {/* Botão fechar no mobile */}
          <button
            onClick={navegar}
            className="md:hidden p-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
          {/* Início — visível para todos */}
          <GrupoNav
            titulo="Geral"
            itens={[{ label: 'Início', href: '/inicio', icone: <House size={16} /> }]}
            onNavegar={navegar}
          />

          {perfis.includes('vendedor') && (
            <GrupoNav titulo="Vendas" itens={itensVendedor} onNavegar={navegar} />
          )}
          {itensSetores.length > 0 && (
            <GrupoNav titulo="Setores" itens={itensSetores} onNavegar={navegar} />
          )}
          {perfis.includes('supervisor') && (
            <GrupoNav titulo="Supervisor" itens={itensSupervisor} onNavegar={navegar} />
          )}
        </nav>

        {/* Rodapé — usuário */}
        <div className="border-t border-gray-200 p-3 flex-shrink-0" ref={menuRef}>
          {/* Menu popup acima */}
          {menuAberto && (
            <div className="absolute bottom-[72px] left-3 w-[222px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                <p className="text-xs font-semibold text-gray-800 truncate">{usuario?.nome}</p>
                <p className="text-[10px] text-gray-400 truncate">{usuario?.email}</p>
              </div>
              <button
                onClick={() => { setMenuAberto(false); navigate('/configuracoes') }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings size={14} className="text-gray-400" />
                Configurações
              </button>

              {/* Toggle de tema */}
              {onAlternarTema && (
                <button
                  onClick={onAlternarTema}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {tema === 'dark'
                      ? <Sun size={14} className="text-amber-400" />
                      : <Moon size={14} className="text-gray-400" />
                    }
                    <span>{tema === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                  </div>
                  {/* Pill toggle */}
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${tema === 'dark' ? 'bg-[#1E40AF]' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${tema === 'dark' ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                </button>
              )}

              <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                <button
                  onClick={deslogar}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setMenuAberto((v) => !v)}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${
              menuAberto ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
              {usuario?.avatar_url ? (
                <img src={usuario.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1E40AF] flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">{inicial}</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-medium text-gray-900 truncate">{usuario?.nome}</p>
              <p className="text-[10px] text-gray-400 truncate">{usuario?.email}</p>
            </div>
            <ChevronUp
              size={14}
              className={`text-gray-400 flex-shrink-0 transition-transform ${menuAberto ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </aside>

      <ModalPerfil aberto={modalPerfilAberto} onFechar={() => setModalPerfilAberto(false)} />
    </>
  )
}

function GrupoNav({
  titulo, itens, onNavegar,
}: {
  titulo: string
  itens: ItemNav[]
  onNavegar: () => void
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
        {titulo}
      </p>
      <ul className="space-y-0.5">
        {itens.map((item) => (
          <li key={item.href}>
            <NavLink
              to={item.href}
              end={item.href === '/vendedor' || item.href === '/supervisor'}
              onClick={onNavegar}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-[#1E40AF] text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {item.icone}
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {item.badge}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
