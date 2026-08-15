import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

export function AppLayout() {
  return (
    <div className='min-h-screen flex bg-gradient-to-br from-background via-background to-muted/20'>
      <Sidebar />
      <div className='flex flex-col flex-1 min-w-0'>
        <Header />
        <main className='flex flex-col flex-1 p-4 lg:p-8 lg:pt-6 h-[calc(100vh-4rem)] overflow-y-auto'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
