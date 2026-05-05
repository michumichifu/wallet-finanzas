import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'

export function AppShell() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-2 border-b border-border bg-bg-subtle/40 px-4 md:px-6 backdrop-blur">
          <ThemeToggle />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-bg">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
