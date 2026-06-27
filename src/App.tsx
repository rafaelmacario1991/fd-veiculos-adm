import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import EsqueciSenha from '@/pages/EsqueciSenha'
import NovaSenha from '@/pages/NovaSenha'
import Dashboard from '@/pages/Dashboard'
import PainelVendedor from '@/pages/vendedor/PainelVendedor'
import NovaVenda from '@/pages/vendedor/NovaVenda'
import MinhasComissoes from '@/pages/vendedor/MinhasComissoes'
import PainelContratos from '@/pages/setores/PainelContratos'
import PainelFinanceiro from '@/pages/setores/PainelFinanceiro'
import PainelFiscal from '@/pages/setores/PainelFiscal'
import PainelTransferencia from '@/pages/setores/PainelTransferencia'
import PainelSupervisor from '@/pages/supervisor/PainelSupervisor'
import GestaoUsuarios from '@/pages/supervisor/GestaoUsuarios'
import GestaoDespachantes from '@/pages/supervisor/GestaoDespachantes'
import ListaSupervisor from '@/pages/supervisor/ListaSupervisor'
import Aprovacoes from '@/pages/supervisor/Aprovacoes'
import QuadroVendas from '@/pages/supervisor/QuadroVendas'
import DetalheVenda from '@/pages/DetalheVenda'
import Inicio from '@/pages/Inicio'
import Configuracoes from '@/pages/Configuracoes'

function App() {
  const { carregando } = useAuth()

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando sistema...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/nova-senha" element={<NovaSenha />} />

        {/* Rotas protegidas — dentro do Layout */}
        <Route element={<Layout />}>
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Vendedor */}
          <Route path="/vendedor" element={<PainelVendedor />} />
          <Route path="/vendedor/nova-venda" element={<NovaVenda />} />
          <Route path="/vendedor/editar-venda/:id" element={<NovaVenda />} />
          <Route path="/vendedor/comissoes" element={<MinhasComissoes />} />

          {/* Setores */}
          <Route path="/setor/contratos" element={<PainelContratos />} />
          <Route path="/setor/financeiro" element={<PainelFinanceiro />} />
          <Route path="/setor/fiscal" element={<PainelFiscal />} />
          <Route path="/setor/transferencia" element={<PainelTransferencia />} />

          {/* Supervisor */}
          <Route path="/supervisor" element={<PainelSupervisor />} />
          <Route path="/supervisor/lista" element={<ListaSupervisor />} />
          <Route path="/supervisor/aprovacoes" element={<Aprovacoes />} />
          <Route path="/supervisor/quadro-vendas" element={<QuadroVendas />} />
          <Route path="/venda/:saleId" element={<DetalheVenda />} />
          <Route path="/supervisor/usuarios" element={<GestaoUsuarios />} />
          <Route path="/supervisor/despachantes" element={<GestaoDespachantes />} />
        </Route>

        {/* Sem acesso */}
        <Route
          path="/sem-acesso"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <p className="text-gray-700 font-medium">Acesso não configurado</p>
                <p className="text-gray-500 text-sm mt-1">Seu usuário ainda não possui perfil atribuído.</p>
                <p className="text-gray-400 text-sm mt-1">Aguarde o supervisor liberar seu acesso.</p>
              </div>
            </div>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
