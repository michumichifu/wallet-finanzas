import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ArrowRightLeft, FolderTree, Settings } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardPage } from '@/pages/Dashboard'
import { RecordsPage } from '@/pages/Records'
import { AccountsPage } from '@/pages/Accounts'
import { LoginPage } from '@/pages/Login'
import { RegisterPage } from '@/pages/Register'
import { PlaceholderPage } from '@/pages/Placeholder'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const basename = import.meta.env.BASE_URL ?? '/'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="cuentas" element={<AccountsPage />} />
              <Route path="registros" element={<RecordsPage />} />
              <Route path="transferencias" element={<PlaceholderPage title="Transferencias" icon={ArrowRightLeft} />} />
              <Route path="categorias" element={<PlaceholderPage title="Categorías" icon={FolderTree} />} />
              <Route path="ajustes" element={<PlaceholderPage title="Ajustes" icon={Settings} />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
