import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'

import Layout from './components/Layout'
import Login from './pages/Login'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import PacientesList from './pages/pacientes/PacientesList'
import CirurgiasList from './pages/cirurgias/CirurgiasList'
import FinanceiroList from './pages/financeiro/FinanceiroList'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/pacientes" element={<PacientesList />} />
            <Route path="/cirurgias" element={<CirurgiasList />} />
            <Route path="/financeiro" element={<FinanceiroList />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
