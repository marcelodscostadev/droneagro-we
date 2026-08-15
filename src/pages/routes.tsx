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
        path: '/financeiro/apuracao',
        Component: () => <PrivateRoute allowedRoles={['admin']}><ApuracaoPage /></PrivateRoute>,
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
