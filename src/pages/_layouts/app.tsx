import { Outlet } from 'react-router-dom'
import { Header } from '@/components/header'

export function AppLayout() {
  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20 print:bg-white'>
      <div className="print:hidden">
        <Header />
      </div>
      <main className='flex-1 flex flex-col w-full max-w-[1600px] mx-auto p-4 lg:p-8 lg:pt-6 print:p-0'>
        <Outlet />
      </main>
    </div>
  )
}
