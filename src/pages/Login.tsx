import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'

export default function Login() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  if (user) {
    return <Navigate to="/" replace />
  }

  const validate = () => {
    let isValid = true
    setEmailError('')
    setPasswordError('')

    if (!email) {
      setEmailError('E-mail é obrigatório.')
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('E-mail inválido.')
      isValid = false
    }

    if (!password) {
      setPasswordError('Senha é obrigatória.')
      isValid = false
    }

    return isValid
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    const { error } = await signIn(email, password)

    if (error) {
      toast.error('Credenciais inválidas. Por favor, verifique seu e-mail e senha.')
    } else {
      toast.success('Login realizado com sucesso!')
      const role = pb.authStore.record?.papel

      if (role === 'financeiro') {
        navigate('/financeiro')
      } else if (role === 'vendedor') {
        navigate('/agendamentos')
      } else if (role === 'medico') {
        navigate('/cirurgias')
      } else if (role === 'enfermagem') {
        navigate('/pacientes')
      } else {
        navigate('/')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
      {/* Gold & Clean Decorative Background */}
      <div className="absolute top-0 w-full h-2 bg-primary" />
      <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none rounded-full" />

      <Card className="w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative z-10 animate-fade-in-up transition-all duration-500">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto bg-black dark:bg-white w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-md">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Portal Robert Telmann
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400 font-medium">
            Acesse sua conta para gerenciar a clínica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-300 font-semibold">
                E-mail
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors duration-300" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@clinica.com"
                  className={cn(
                    'pl-10 h-11 transition-all duration-300 bg-zinc-50 dark:bg-zinc-950 focus-visible:ring-primary',
                    emailError && 'border-destructive focus-visible:ring-destructive',
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              {emailError && (
                <p className="text-sm text-destructive font-medium animate-fade-in">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  Senha
                </Label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors duration-300" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn(
                    'pl-10 pr-10 h-11 transition-all duration-300 bg-zinc-50 dark:bg-zinc-950 focus-visible:ring-primary',
                    passwordError && 'border-destructive focus-visible:ring-destructive',
                  )}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive font-medium animate-fade-in">
                  {passwordError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold shadow-md hover:shadow-lg transition-all duration-300 bg-primary hover:bg-primary/90 text-black group mt-4"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Autenticando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Acessar Sistema
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
