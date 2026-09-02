import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './_layouts/app'
import { AuthLayout } from './_layouts/auth'
import { ClientLayout } from './_layouts/client'
import { PrivateRoute, ClientRoute } from './private-route'
import { SignIn } from './auth/sign-in'
import { Dashboard } from './app/dashboard/dashboard'
import { ClientesPage } from './app/clientes/clientes'
import { UsuariosPage } from './app/usuarios/usuarios'
import { AgendamentosPage } from './app/agendamentos/agendamentos'
import { OrdensDeServico } from './app/ordens-de-servico/ordens-de-servico'
import { BoletinsPage } from './app/boletins/boletins'
import { BoletimPdfPage } from './app/boletins/boletim-pdf'
import { ContasReceberPage } from './app/financeiro/contas-receber'
import { ContasPagarPage } from './app/financeiro/contas-pagar'
import { ComissoesPage } from './app/financeiro/comissoes'
import { ApuracaoPage } from './app/financeiro/apuracao'
import { CadastrosFinanceirosPage } from './app/financeiro/cadastros'
import { FluxoCaixaPage } from './app/financeiro/fluxo-caixa'
import { OperacionalPage } from './app/relatorios/operacional'
import { ItinerariosPage } from './app/relatorios/itinerarios'
import { ItinerarioPdfPage } from './app/relatorios/itinerario-pdf'
import { MapaPage } from './app/mapa/mapa'
import { ConfiguracoesPage } from './app/configuracoes/configuracoes'
// Portal do Cliente
import { ClientLogin } from './cliente/login'
import { ClientDashboard } from './cliente/dashboard'
import { ClientAgendamentos } from './cliente/agendamentos'
import { ClientHistorico } from './cliente/historico'
import { ClientDocumentos } from './cliente/documentos'
import { ClientMapa } from './cliente/mapa'
import { ClientPerfil } from './cliente/perfil'

export const router = createBrowserRouter([
  // ─── Painel Admin / Técnicos ────────────────────────────────────
  {
    path: '/',
    Component: AppLayout,
    children: [
      {
        path: '/',
        Component: () => <PrivateRoute><Dashboard /></PrivateRoute>,
      },
      {
        path: '/clientes',
        Component: () => <PrivateRoute><ClientesPage /></PrivateRoute>,
      },
      {
        path: '/usuarios',
        Component: () => <PrivateRoute allowedRoles={['admin']}><UsuariosPage /></PrivateRoute>,
      },
      {
        path: '/agendamentos',
        Component: () => <PrivateRoute><AgendamentosPage /></PrivateRoute>,
      },
      {
        path: '/ordens-de-servico',
        Component: () => <PrivateRoute><OrdensDeServico /></PrivateRoute>,
      },
      {
        path: '/boletins',
        Component: () => <PrivateRoute><BoletinsPage /></PrivateRoute>,
      },
      {
        path: '/boletins/:id/pdf',
        Component: () => <PrivateRoute><BoletimPdfPage /></PrivateRoute>,
      },
      {
        path: '/financeiro/receber',
        Component: () => <PrivateRoute allowedRoles={['admin']}><ContasReceberPage /></PrivateRoute>,
      },
      {
        path: '/financeiro/pagar',
        Component: () => <PrivateRoute allowedRoles={['admin']}><ContasPagarPage /></PrivateRoute>,
      },
      {
        path: '/financeiro/comissoes',
        Component: () => <PrivateRoute allowedRoles={['admin']}><ComissoesPage /></PrivateRoute>,
      },
      {
        path: '/relatorios/operacional',
        Component: () => <PrivateRoute allowedRoles={['admin']}><OperacionalPage /></PrivateRoute>,
      },
      {
        path: '/relatorios/itinerarios',
        Component: () => <PrivateRoute allowedRoles={['admin']}><ItinerariosPage /></PrivateRoute>,
      },
      {
        path: '/relatorios/itinerarios/:id/pdf',
        Component: () => <PrivateRoute allowedRoles={['admin']}><ItinerarioPdfPage /></PrivateRoute>,
      },
      {
        path: '/financeiro/cadastros',
        Component: () => <PrivateRoute allowedRoles={['admin']}><CadastrosFinanceirosPage /></PrivateRoute>,
      },
      {
        path: '/financeiro/apuracao',
        Component: () => <PrivateRoute allowedRoles={['admin']}><ApuracaoPage /></PrivateRoute>,
      },
      {
        path: '/financeiro/fluxo-caixa',
        Component: () => <PrivateRoute allowedRoles={['admin']}><FluxoCaixaPage /></PrivateRoute>,
      },
      {
        path: '/mapa',
        Component: () => <PrivateRoute><MapaPage /></PrivateRoute>,
      },
      {
        path: '/configuracoes',
        Component: () => <PrivateRoute allowedRoles={['admin']}><ConfiguracoesPage /></PrivateRoute>,
      },
    ],
  },

  // ─── Auth ────────────────────────────────────────────────────────
  {
    path: '/auth',
    Component: AuthLayout,
    children: [
      { path: '/auth/sign-in', Component: SignIn },
    ],
  },

  // ─── Portal do Cliente ──────────────────────────────────────────
  {
    path: '/cliente/login',
    Component: ClientLogin,
  },
  {
    path: '/cliente',
    Component: ClientLayout,
    children: [
      {
        path: '/cliente/dashboard',
        Component: () => <ClientRoute><ClientDashboard /></ClientRoute>,
      },
      {
        path: '/cliente/agendamentos',
        Component: () => <ClientRoute><ClientAgendamentos /></ClientRoute>,
      },
      {
        path: '/cliente/historico',
        Component: () => <ClientRoute><ClientHistorico /></ClientRoute>,
      },
      {
        path: '/cliente/documentos',
        Component: () => <ClientRoute><ClientDocumentos /></ClientRoute>,
      },
      {
        path: '/cliente/mapa',
        Component: () => <ClientRoute><ClientMapa /></ClientRoute>,
      },
      {
        path: '/cliente/perfil',
        Component: () => <ClientRoute><ClientPerfil /></ClientRoute>,
      },
    ],
  },
])

