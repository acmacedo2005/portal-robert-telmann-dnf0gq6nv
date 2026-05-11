import { useState, useEffect, useMemo } from 'react'
import { api, Agendamento, Paciente } from '@/services/db'
import { RecordModel } from 'pocketbase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { Plus, Search, CalendarX, CheckCircle, Edit, Clock, AlertCircle } from 'lucide-react'
import { format, isToday, isSameWeek, isSameMonth, parseISO } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'

export default function AgendamentosList() {
  const { user } = useAuth()
  const canManage = ['admin', 'vendedor'].includes(user?.papel)

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<RecordModel[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [currentTab, setCurrentTab] = useState('mes')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null)

  const loadData = async () => {
    try {
      setError(false)
      const [a, p, pr] = await Promise.all([
        api.agendamentos.list(),
        api.pacientes.list(),
        api.users.list(),
      ])
      setAgendamentos(a)
      setPacientes(p)
      setProfissionais(pr)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('agendamentos', () => loadData())

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const data: Partial<Agendamento> = {
      paciente_id: formData.get('paciente_id') as string,
      tipo: formData.get('tipo') as any,
      data_agendamento: new Date(formData.get('data_agendamento') as string).toISOString(),
      hora_agendamento: formData.get('hora_agendamento') as string,
      profissional_id: formData.get('profissional_id') as string,
      status: (formData.get('status') as any) || 'agendado',
      observacoes: formData.get('observacoes') as string,
    }

    try {
      await api.agendamentos.create(data)
      toast.success('Agendamento criado com sucesso')
      setIsCreateOpen(false)
    } catch (error) {
      toast.error('Erro ao criar agendamento')
    }
  }

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingAgendamento) return
    const formData = new FormData(e.currentTarget)

    const data: Partial<Agendamento> = {
      data_agendamento: new Date(formData.get('data_agendamento') as string).toISOString(),
      hora_agendamento: formData.get('hora_agendamento') as string,
      profissional_id: formData.get('profissional_id') as string,
      status: formData.get('status') as any,
      observacoes: formData.get('observacoes') as string,
    }

    try {
      await api.agendamentos.update(editingAgendamento.id, data)
      toast.success('Agendamento atualizado com sucesso')
      setIsEditOpen(false)
      setEditingAgendamento(null)
    } catch (error) {
      toast.error('Erro ao atualizar agendamento')
    }
  }

  const handleMarkRealizado = async (id: string) => {
    try {
      await api.agendamentos.update(id, { status: 'realizada' })
      toast.success('Agendamento marcado como realizado')
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  const filteredAgendamentos = useMemo(() => {
    return agendamentos.filter((a) => {
      if (!a.data_agendamento) return false
      const date = parseISO(a.data_agendamento)
      const now = new Date()

      if (currentTab === 'dia' && !isToday(date)) return false
      if (currentTab === 'semana' && !isSameWeek(date, now, { weekStartsOn: 1 })) return false
      if (currentTab === 'mes' && !isSameMonth(date, now)) return false

      const pacienteNome = a.expand?.paciente_id?.nome?.toLowerCase() || ''
      if (search && !pacienteNome.includes(search.toLowerCase())) return false

      if (filterTipo !== 'todos' && a.tipo !== filterTipo) return false
      if (filterStatus !== 'todos' && a.status !== filterStatus) return false

      return true
    })
  }, [agendamentos, currentTab, search, filterTipo, filterStatus])

  const getStatusColor = (status: string) => {
    if (status === 'realizada') return 'bg-green-500 hover:bg-green-600'
    if (status === 'cancelado') return 'bg-red-500 hover:bg-red-600'
    if (status === 'rascunho') return 'bg-gray-400 hover:bg-gray-500'
    return 'bg-blue-500 hover:bg-blue-600'
  }

  const openEdit = (agendamento: Agendamento) => {
    setEditingAgendamento(agendamento)
    setIsEditOpen(true)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-card text-card-foreground shadow-sm">
        <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
        <h2 className="text-xl font-bold mb-2">Erro ao carregar agendamentos</h2>
        <p className="text-muted-foreground mb-4">
          Ocorreu um problema ao buscar os dados do servidor.
        </p>
        <Button onClick={loadData}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Agenda da Clínica</h2>
          <p className="text-muted-foreground">Gerencie todos os agendamentos e retornos.</p>
        </div>
        {canManage && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-subtle">
                <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Agendamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select name="paciente_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pacientes.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select name="tipo" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avaliacao">Avaliação</SelectItem>
                      <SelectItem value="cirurgia">Cirurgia</SelectItem>
                      <SelectItem value="tratamento">Tratamento</SelectItem>
                      <SelectItem value="retorno">Retorno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Profissional *</Label>
                  <Select name="profissional_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionais.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input type="date" name="data_agendamento" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input type="time" name="hora_agendamento" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select name="status" defaultValue="agendado">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="realizada">Realizado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input name="observacoes" placeholder="Anotações opcionais..." />
                </div>
                <Button type="submit" className="w-full">
                  Salvar Agendamento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-card shadow-sm border-border">
        <CardContent className="p-4 space-y-4">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 md:w-[400px]">
              <TabsTrigger value="dia">Dia</TabsTrigger>
              <TabsTrigger value="semana">Semana</TabsTrigger>
              <TabsTrigger value="mes">Mês</TabsTrigger>
              <TabsTrigger value="todos">Todos</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-full md:w-[160px] bg-background">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="avaliacao">Avaliação</SelectItem>
                  <SelectItem value="cirurgia">Cirurgia</SelectItem>
                  <SelectItem value="tratamento">Tratamento</SelectItem>
                  <SelectItem value="retorno">Retorno</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[160px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="realizada">Realizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      ) : filteredAgendamentos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-muted-foreground border-dashed shadow-none">
          <CalendarX className="h-12 w-12 mb-4 text-muted" />
          <p className="text-lg font-medium text-foreground">Nenhum agendamento encontrado</p>
          <p className="text-sm">Tente ajustar os filtros ou busque por outro paciente.</p>
          {canManage && (
            <Button className="mt-6" onClick={() => setIsCreateOpen(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Agendar Agora
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden md:block rounded-md border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgendamentos.map((a) => (
                  <TableRow key={a.id} className="group transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {format(parseISO(a.data_agendamento), 'dd/MM/yyyy')}
                        {a.hora_agendamento && (
                          <span className="text-muted-foreground ml-1">{a.hora_agendamento}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {a.expand?.paciente_id?.nome}
                    </TableCell>
                    <TableCell className="capitalize">{a.tipo}</TableCell>
                    <TableCell>{a.expand?.profissional_id?.name}</TableCell>
                    <TableCell>
                      <Badge
                        className={`${getStatusColor(a.status)} capitalize text-white border-0 shadow-sm`}
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        {a.status !== 'realizada' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8"
                            onClick={() => handleMarkRealizado(a.id)}
                            title="Marcar como realizado"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-muted"
                            onClick={() => openEdit(a)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredAgendamentos.map((a) => (
              <Card key={a.id} className="overflow-hidden shadow-sm">
                <div className={`h-1.5 w-full ${getStatusColor(a.status)}`} />
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base flex justify-between items-start gap-2">
                    <span className="font-bold text-primary truncate">
                      {a.expand?.paciente_id?.nome}
                    </span>
                    <Badge
                      className={`${getStatusColor(a.status)} capitalize text-white border-0 shrink-0`}
                    >
                      {a.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div className="flex items-center gap-2 font-medium text-foreground bg-muted/50 p-2.5 rounded-md">
                    <Clock className="h-4 w-4 text-primary" />
                    {format(parseISO(a.data_agendamento), 'dd/MM/yyyy')}
                    {a.hora_agendamento && ` às ${a.hora_agendamento}`}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider mb-1">
                        Tipo
                      </span>
                      <span className="capitalize text-foreground font-medium">{a.tipo}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider mb-1">
                        Profissional
                      </span>
                      <span className="text-foreground font-medium">
                        {a.expand?.profissional_id?.name || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-border">
                    {a.status !== 'realizada' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleMarkRealizado(a.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" /> Realizado
                      </Button>
                    )}
                    {canManage && (
                      <Button size="sm" variant="secondary" onClick={() => openEdit(a)}>
                        <Edit className="h-4 w-4 mr-2" /> Editar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          {editingAgendamento && (
            <form onSubmit={handleEdit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    name="data_agendamento"
                    defaultValue={editingAgendamento.data_agendamento.split('T')[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    name="hora_agendamento"
                    defaultValue={editingAgendamento.hora_agendamento}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Profissional *</Label>
                <Select
                  name="profissional_id"
                  defaultValue={editingAgendamento.profissional_id}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profissionais.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={editingAgendamento.status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="realizada">Realizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Input
                  name="observacoes"
                  defaultValue={editingAgendamento.observacoes}
                  placeholder="Anotações opcionais..."
                />
              </div>

              <Button type="submit" className="w-full">
                Atualizar Agendamento
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
