import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './_layouts/app'
import { AuthLayout } from './_layouts/auth'
import { PrivateRoute } from './private-route'
import { SignIn } from './auth/sign-in'
import { Dashboard } from './app/dashboard/dashboard'
import { ClientesPage } from './app/clientes/clientes'
import { UsuariosPage } from './app/usuarios/usuarios'
import { AgendamentosPage } from './app/agendamentos/agendamentos'
import { OrdensDeServico } from './app/ordens-de-servico/ordens-de-servico'
import { BoletinsPage } from './app/boletins/boletins'
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

export const router = createBrowserRouter([
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
        path: '/relatorios/operacional',
        Component: () => <PrivateRoute><OperacionalPage /></PrivateRoute>,
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
  {
    path: '/auth',
    Component: AuthLayout,
    children: [
      { path: '/auth/sign-in', Component: SignIn },
    ],
  },
])
