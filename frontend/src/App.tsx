import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ArrowRightLeft, FolderTree, Receipt, Settings, Wallet } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/Dashboard'
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
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="cuentas" element={<PlaceholderPage title="Cuentas" icon={Wallet} />} />
            <Route path="registros" element={<PlaceholderPage title="Registros" icon={Receipt} />} />
            <Route path="transferencias" element={<PlaceholderPage title="Transferencias" icon={ArrowRightLeft} />} />
            <Route path="categorias" element={<PlaceholderPage title="Categorías" icon={FolderTree} />} />
            <Route path="ajustes" element={<PlaceholderPage title="Ajustes" icon={Settings} />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
