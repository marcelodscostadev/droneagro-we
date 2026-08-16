import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

export function AppLayout() {
  return (
    <div className='min-h-screen flex bg-gradient-to-br from-background via-background to-muted/20 print:bg-white'>
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className='flex flex-col flex-1 min-w-0'>
        <div className="print:hidden">
          <Header />
        </div>
        <main className='flex flex-col flex-1 p-4 lg:p-8 lg:pt-6 h-[calc(100vh-4rem)] overflow-y-auto print:h-auto print:overflow-visible print:p-0'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
