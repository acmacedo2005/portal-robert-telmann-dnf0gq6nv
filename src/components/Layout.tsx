import { Outlet, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { LogOut, Home, Users, DollarSign, Menu, Calendar, ShoppingCart } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

export default function Layout() {
  const { user, signOut, loading } = useAuth()
  const location = useLocation()

  if (loading)
    return <div className="h-screen w-screen flex items-center justify-center">Carregando...</div>

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center space-y-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse text-lg">
          Nenhum usuário logado.
        </p>
        <Navigate to="/login" replace />
      </div>
    )
  }

  const role = user.papel || 'enfermagem'

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: Home,
      roles: ['admin'],
    },
    {
      name: 'Agendamentos',
      path: '/agendamentos',
      icon: Calendar,
      roles: ['admin', 'vendedor', 'medico', 'enfermagem'],
    },
    {
      name: 'Pacientes',
      path: '/pacientes',
      icon: Users,
      roles: ['admin', 'enfermagem'],
    },
    {
      name: 'Vendas',
      path: '/vendas',
      icon: ShoppingCart,
      roles: ['admin', 'vendedor'],
    },
    {
      name: 'Financeiro',
      path: '/financeiro',
      icon: DollarSign,
      roles: ['admin', 'financeiro'],
    },
  ]

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-zinc-200 dark:border-zinc-800">
        <SidebarHeader className="h-16 flex items-center justify-center border-b px-4 bg-black dark:bg-zinc-900">
          <h1 className="text-xl font-bold text-primary truncate">Portal Telmann</h1>
        </SidebarHeader>
        <SidebarContent className="py-4 bg-white dark:bg-zinc-950">
          <SidebarMenu>
            {visibleNavItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                  tooltip={item.name}
                  className="hover:bg-primary/10 hover:text-primary transition-colors data-[active=true]:bg-primary data-[active=true]:text-black"
                >
                  <Link to={item.path}>
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2 text-zinc-600 hover:text-primary transition-colors" />
            <h2 className="text-xl font-bold capitalize hidden sm:block text-black dark:text-white">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1)}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-bold text-black dark:text-white">
                {user.name || user.nome || user.email}
              </p>
              <p className="text-primary font-medium capitalize">{user.papel}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Sair"
              className="hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-zinc-50 dark:bg-zinc-950">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
