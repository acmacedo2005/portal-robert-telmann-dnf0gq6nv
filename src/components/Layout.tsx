import { Outlet, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { LogOut, Home, Users, Activity, DollarSign, Menu } from 'lucide-react'
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
  if (!user) return <Navigate to="/login" replace />

  const role = user.papel || 'enfermagem'

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: Home,
      roles: ['admin', 'vendedor', 'financeiro', 'medico', 'enfermagem'],
    },
    {
      name: 'Pacientes',
      path: '/pacientes',
      icon: Users,
      roles: ['admin', 'vendedor', 'medico', 'enfermagem'],
    },
    {
      name: 'Cirurgias',
      path: '/cirurgias',
      icon: Activity,
      roles: ['admin', 'vendedor', 'medico', 'financeiro'],
    },
    { name: 'Financeiro', path: '/financeiro', icon: DollarSign, roles: ['admin', 'financeiro'] },
  ]

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="h-16 flex items-center justify-center border-b px-4">
          <h1 className="text-xl font-bold text-primary truncate">Clínica Capilar</h1>
        </SidebarHeader>
        <SidebarContent className="py-4">
          <SidebarMenu>
            {visibleNavItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                  tooltip={item.name}
                >
                  <Link to={item.path}>
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6 bg-background">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2" />
            <h2 className="text-lg font-semibold capitalize hidden sm:block">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1)}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-muted-foreground capitalize">{user.papel}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-muted/30">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
