import { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Plus,
  Search,
  CalendarX,
  Edit,
  Clock,
  AlertCircle,
  UserPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  LayoutList,
  CalendarDays,
} from 'lucide-react'
import {
  format,
  isSameMonth,
  parseISO,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameWeek,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/hooks/use-auth'

export default function AgendamentosList() {
  const { user } = useAuth()
  const canManage = ['admin', 'vendedor', 'enfermagem'].includes(user?.papel || '')

  const [agendamentos, setAgendamentos] = useState<RecordModel[]>([])
  const [pacientes, setPacientes] = useState<RecordModel[]>([])
  const [profissionais, setProfissionais] = useState<RecordModel[]>([])
  const [saldos, setSaldos] = useState<RecordModel[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [search, setSearch] = useState('')
  const [filterTipos, setFilterTipos] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [sortBy, setSortBy] = useState('data')

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'dia' | 'semana' | 'mes'>('mes')
  const [displayStyle, setDisplayStyle] = useState<'list' | 'calendar'>('list')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingAgendamento, setEditingAgendamento] = useState<RecordModel | null>(null)

  const [isCreatingPatient, setIsCreatingPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ nome: '', telefone: '', email: '' })
  const [selectedPacienteId, setSelectedPacienteId] = useState<string>('novo')
  const [selectedTipo, setSelectedTipo] = useState('')

  const availableTypes = ['avaliacao', 'cirurgia', 'aplicacao', 'retorno', 'meso', 'prp', 'botox']

  const loadData = async () => {
    try {
      setError(false)
      const [a, p, pr, s] = await Promise.all([
        pb.collection('agendamentos').getFullList({
          expand: 'paciente_id,profissional_id,saldo_tratamento_id',
          sort: '-data_agendamento',
        }),
        pb.collection('pacientes').getFullList({ sort: 'nome' }),
        pb
          .collection('users')
          .getFullList({ filter: 'papel="medico" || papel="enfermagem"', sort: 'name' }),
        pb
          .collection('saldo_tratamentos')
          .getFullList({ filter: 'sessoes_restantes > 0', expand: 'paciente_id' }),
      ])
      setAgendamentos(a)
      setPacientes(p)
      setProfissionais(pr)
      setSaldos(s)
    } catch {
      setError(true)
      toast.error('Erro ao carregar dados do servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('agendamentos', () => loadData())
  useRealtime('pacientes', () => loadData())

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    let pId = selectedPacienteId
    if (isCreatingPatient || selectedPacienteId === 'novo') {
      if (!newPatient.nome) {
        toast.error('O nome do paciente é obrigatório.')
        return
      }
      try {
        const p = await pb.collection('pacientes').create(newPatient)
        pId = p.id
      } catch (err) {
        toast.error('Erro ao cadastrar novo paciente.')
        return
      }
    }

    if (!pId || pId === 'novo') {
      toast.error('Selecione ou cadastre um paciente.')
      return
    }

    const tipo = formData.get('tipo') as string
    const saldo_tratamento_id = formData.get('saldo_tratamento_id') as string

    if (['aplicacao', 'meso', 'prp', 'botox'].includes(tipo) && !saldo_tratamento_id) {
      toast.error('Um Saldo de Tratamento vinculado é obrigatório para aplicações.')
      return
    }

    const data = {
      paciente_id: pId,
      tipo,
      data_agendamento: new Date(formData.get('data_agendamento') as string).toISOString(),
      hora_agendamento: formData.get('hora_agendamento') as string,
      profissional_id: formData.get('profissional_id') as string,
      status: (formData.get('status') as string) || 'agendado',
      observacoes: formData.get('observacoes') as string,
      saldo_tratamento_id: saldo_tratamento_id || null,
    }

    try {
      await pb.collection('agendamentos').create(data)
      toast.success('Registro criado com sucesso')
      setIsCreateOpen(false)
      setIsCreatingPatient(false)
      setNewPatient({ nome: '', telefone: '', email: '' })
      setSelectedPacienteId('novo')
      setSelectedTipo('')
    } catch (error) {
      toast.error('Falha ao criar o agendamento.')
    }
  }

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingAgendamento) return
    const formData = new FormData(e.currentTarget)

    const data = {
      data_agendamento: new Date(formData.get('data_agendamento') as string).toISOString(),
      hora_agendamento: formData.get('hora_agendamento') as string,
      profissional_id: formData.get('profissional_id') as string,
      status: formData.get('status') as string,
      observacoes: formData.get('observacoes') as string,
    }

    try {
      await pb.collection('agendamentos').update(editingAgendamento.id, data)
      toast.success('Informações do agendamento atualizadas com sucesso')
      setIsEditOpen(false)
      setEditingAgendamento(null)
    } catch (error) {
      toast.error('Erro de servidor ao tentar atualizar o agendamento.')
    }
  }

  const handleMarkRealizado = async (a: RecordModel) => {
    try {
      await pb.collection('agendamentos').update(a.id, { status: 'realizada' })
      if (a.saldo_tratamento_id) {
        const saldo = await pb.collection('saldo_tratamentos').getOne(a.saldo_tratamento_id)
        await pb.collection('saldo_tratamentos').update(saldo.id, {
          sessoes_realizadas: saldo.sessoes_realizadas + 1,
          sessoes_restantes: saldo.sessoes_restantes - 1,
          status: saldo.sessoes_restantes - 1 <= 0 ? 'concluido' : 'ativo',
        })
      }
      toast.success('Agendamento marcado como realizado!')
    } catch (error) {
      toast.error('Problema ao atualizar o status.')
    }
  }

  const toggleTypeFilter = (t: string) => {
    setFilterTipos((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const filteredAgendamentos = useMemo(() => {
    let list = agendamentos.filter((a) => {
      if (!a.data_agendamento) return false
      const date = parseISO(a.data_agendamento)

      if (viewMode === 'dia' && !isSameDay(date, currentDate)) return false
      if (viewMode === 'semana' && !isSameWeek(date, currentDate, { weekStartsOn: 1 })) return false
      if (viewMode === 'mes' && !isSameMonth(date, currentDate)) return false

      const pacienteNome = a.expand?.paciente_id?.nome?.toLowerCase() || ''
      if (search && !pacienteNome.includes(search.toLowerCase())) return false

      if (filterTipos.length > 0 && !filterTipos.includes(a.tipo)) return false
      if (filterStatus !== 'todos' && a.status !== filterStatus) return false

      return true
    })

    list.sort((a, b) => {
      if (sortBy === 'data')
        return new Date(b.data_agendamento).getTime() - new Date(a.data_agendamento).getTime()
      if (sortBy === 'paciente')
        return (a.expand?.paciente_id?.nome || '').localeCompare(b.expand?.paciente_id?.nome || '')
      if (sortBy === 'tipo') return a.tipo.localeCompare(b.tipo)
      if (sortBy === 'profissional')
        return (
          a.expand?.profissional_id?.name ||
          a.expand?.profissional_id?.nome ||
          ''
        ).localeCompare(b.expand?.profissional_id?.name || b.expand?.profissional_id?.nome || '')
      return 0
    })

    return list
  }, [agendamentos, viewMode, currentDate, search, filterTipos, filterStatus, sortBy])

  const getStatusColor = (status: string) => {
    if (status === 'realizada')
      return {
        bg: 'bg-zinc-800 dark:bg-zinc-100',
        text: 'text-white dark:text-black',
        border: 'border-transparent',
      }
    if (status === 'cancelado')
      return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' }
    if (status === 'rascunho')
      return { bg: 'bg-zinc-400', text: 'text-white', border: 'border-zinc-500' }
    return { bg: 'bg-primary', text: 'text-primary-foreground', border: 'border-primary/80' }
  }

  const openEdit = (a: RecordModel) => {
    setEditingAgendamento(a)
    setIsEditOpen(true)
  }

  const handlePrev = () => {
    if (viewMode === 'dia') setCurrentDate(subDays(currentDate, 1))
    if (viewMode === 'semana') setCurrentDate(subWeeks(currentDate, 1))
    if (viewMode === 'mes') setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNext = () => {
    if (viewMode === 'dia') setCurrentDate(addDays(currentDate, 1))
    if (viewMode === 'semana') setCurrentDate(addWeeks(currentDate, 1))
    if (viewMode === 'mes') setCurrentDate(addMonths(currentDate, 1))
  }

  const formattedDateRange = () => {
    if (viewMode === 'dia') return format(currentDate, "dd 'de' MMMM", { locale: ptBR })
    if (viewMode === 'semana') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, 'dd/MM', { locale: ptBR })} a ${format(end, 'dd/MM, yyyy', { locale: ptBR })}`
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
  }

  const patientSaldos = useMemo(() => {
    if (!selectedPacienteId || selectedPacienteId === 'novo') return []
    return saldos.filter((s) => s.paciente_id === selectedPacienteId)
  }, [saldos, selectedPacienteId])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-sm">
        <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
        <h2 className="text-xl font-bold mb-2 text-black dark:text-white">
          Falha ao acessar os dados
        </h2>
        <Button onClick={loadData} className="font-bold mt-4">
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            Agenda da Clínica
          </h2>
          <p className="text-zinc-500 font-medium">
            Gerencie e monitore todos os compromissos diários.
          </p>
        </div>
        {canManage && (
          <Dialog
            open={isCreateOpen}
            onOpenChange={(val) => {
              setIsCreateOpen(val)
              if (!val) {
                setIsCreatingPatient(false)
                setSelectedPacienteId('novo')
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="shadow-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-bold">
                <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-black dark:text-white">
                  Registrar Agendamento
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-black dark:text-white">Paciente</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/10"
                      onClick={() => {
                        setIsCreatingPatient(!isCreatingPatient)
                        if (!isCreatingPatient) setSelectedPacienteId('novo')
                      }}
                    >
                      {isCreatingPatient ? (
                        'Selecionar Existente'
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1" /> Criar Novo
                        </>
                      )}
                    </Button>
                  </div>

                  {isCreatingPatient ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Nome Completo *</Label>
                        <Input
                          required
                          value={newPatient.nome}
                          onChange={(e) => setNewPatient({ ...newPatient, nome: e.target.value })}
                          className="bg-white dark:bg-zinc-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Telefone</Label>
                        <Input
                          value={newPatient.telefone}
                          onChange={(e) =>
                            setNewPatient({ ...newPatient, telefone: e.target.value })
                          }
                          className="bg-white dark:bg-zinc-900"
                        />
                      </div>
                    </div>
                  ) : (
                    <Select
                      value={selectedPacienteId}
                      onValueChange={setSelectedPacienteId}
                      required
                    >
                      <SelectTrigger className="bg-white dark:bg-zinc-900 font-medium">
                        <SelectValue placeholder="Selecione o paciente cadastrado..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo" disabled className="hidden">
                          Selecione o paciente...
                        </SelectItem>
                        {pacientes.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-black dark:text-white">Tipo *</Label>
                    <Select
                      name="tipo"
                      value={selectedTipo}
                      onValueChange={setSelectedTipo}
                      required
                    >
                      <SelectTrigger className="font-medium">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avaliacao">Avaliação</SelectItem>
                        <SelectItem value="cirurgia">Cirurgia</SelectItem>
                        <SelectItem value="aplicacao">Aplicação</SelectItem>
                        <SelectItem value="meso">Meso</SelectItem>
                        <SelectItem value="prp">PRP</SelectItem>
                        <SelectItem value="botox">Botox</SelectItem>
                        <SelectItem value="retorno">Retorno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-black dark:text-white">Profissional *</Label>
                    <Select name="profissional_id" required>
                      <SelectTrigger className="font-medium">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {profissionais.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name || m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {['aplicacao', 'meso', 'prp', 'botox'].includes(selectedTipo) && (
                  <div className="space-y-2 p-3 bg-primary/10 rounded-md border border-primary/30">
                    <Label className="font-bold text-primary">Vincular Pacote / Saldo *</Label>
                    <Select name="saldo_tratamento_id" required>
                      <SelectTrigger className="bg-white dark:bg-zinc-900 font-medium border-primary/50 text-black dark:text-white">
                        <SelectValue placeholder="Selecione o pacote disponível..." />
                      </SelectTrigger>
                      <SelectContent>
                        {patientSaldos.length === 0 ? (
                          <div className="p-3 text-sm font-semibold text-zinc-500">
                            O paciente não possui pacotes ativos.
                          </div>
                        ) : (
                          patientSaldos.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="font-semibold">
                              {s.tipo_tratamento.toUpperCase()} - Restam {s.sessoes_restantes}{' '}
                              sessões
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-black dark:text-white">Data *</Label>
                    <Input type="date" name="data_agendamento" required className="font-medium" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-black dark:text-white">Hora</Label>
                    <Input type="time" name="hora_agendamento" className="font-medium" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-black dark:text-white">Observações Extras</Label>
                  <Input
                    name="observacoes"
                    placeholder="Anotações para o profissional..."
                    className="font-medium"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 font-bold text-base mt-2 bg-primary text-black hover:bg-primary/90 shadow-md"
                >
                  Confirmar Agendamento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="bg-white dark:bg-zinc-900 shadow-md border border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {/* Calendar Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-[120px] font-bold h-10 border-zinc-200 dark:border-zinc-800">
                  <SelectValue placeholder="Visualização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Dia</SelectItem>
                  <SelectItem value="semana">Semana</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-md p-1 border border-zinc-200 dark:border-zinc-700">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-white dark:hover:bg-zinc-900"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 font-bold px-3 capitalize hover:bg-white dark:hover:bg-zinc-900"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {formattedDateRange()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={(d) => d && setCurrentDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-white dark:hover:bg-zinc-900"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {viewMode === 'mes' && (
                <div className="hidden sm:flex bg-zinc-100 dark:bg-zinc-800 rounded-md p-1 border border-zinc-200 dark:border-zinc-700">
                  <Button
                    variant={displayStyle === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 font-bold px-3 shadow-none"
                    onClick={() => setDisplayStyle('list')}
                  >
                    <LayoutList className="h-4 w-4 mr-2" /> Lista
                  </Button>
                  <Button
                    variant={displayStyle === 'calendar' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 font-bold px-3 shadow-none text-zinc-600 dark:text-zinc-400"
                    onClick={() => setDisplayStyle('calendar')}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" /> Calendário
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[150px] h-10 font-bold border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="font-semibold">
                    Todos Status
                  </SelectItem>
                  <SelectItem value="agendado" className="font-semibold">
                    Agendado
                  </SelectItem>
                  <SelectItem value="realizada" className="font-semibold">
                    Realizado
                  </SelectItem>
                  <SelectItem value="cancelado" className="font-semibold">
                    Cancelado
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[150px] h-10 font-bold border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="paciente">Paciente</SelectItem>
                  <SelectItem value="tipo">Tipo</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center pt-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar por paciente..."
                className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center flex-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mr-1 hidden sm:block">
                Filtrar:
              </span>
              <ScrollArea className="w-[calc(100vw-2rem)] sm:w-auto whitespace-nowrap pb-2 sm:pb-0">
                <div className="flex gap-2">
                  {availableTypes.map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className={`cursor-pointer capitalize px-3 py-1.5 font-bold transition-all shadow-sm shrink-0 ${filterTipos.includes(t) ? 'bg-primary text-primary-foreground border-primary scale-105' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-primary border-zinc-200 dark:border-zinc-700'}`}
                      onClick={() => toggleTypeFilter(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
        </div>
      ) : filteredAgendamentos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-zinc-500 border-dashed border-2 shadow-none bg-zinc-50 dark:bg-zinc-950/50">
          <CalendarX className="h-12 w-12 mb-4 text-zinc-400" />
          <p className="text-lg font-bold text-black dark:text-white">Nenhum registro</p>
          <p className="text-sm font-medium mt-1 mb-6">
            Ajuste os filtros ou crie um novo compromisso.
          </p>
          {canManage && (
            <Button
              className="font-bold bg-primary text-black hover:bg-primary/90 shadow-md"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Incluir
            </Button>
          )}
        </Card>
      ) : (
        <>
          {displayStyle === 'calendar' && viewMode === 'mes' ? (
            <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div
                  key={d}
                  className="bg-zinc-100 dark:bg-zinc-900 p-2 text-center text-[10px] font-bold text-zinc-500 uppercase"
                >
                  {d}
                </div>
              ))}
              {eachDayOfInterval({
                start: startOfWeek(startOfMonth(currentDate)),
                end: endOfWeek(endOfMonth(currentDate)),
              }).map((day, i) => {
                const dayAgendamentos = filteredAgendamentos.filter((a) =>
                  isSameDay(parseISO(a.data_agendamento), day),
                )
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isTodayDate = isToday(day)
                return (
                  <div
                    key={i}
                    className={`min-h-[120px] p-1.5 bg-white dark:bg-zinc-950 ${!isCurrentMonth ? 'opacity-40 bg-zinc-50 dark:bg-zinc-900/50' : ''}`}
                  >
                    <div
                      className={`font-bold text-xs mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-primary text-primary-foreground' : 'text-zinc-500'}`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayAgendamentos.slice(0, 4).map((a) => {
                        const colors = getStatusColor(a.status)
                        return (
                          <div
                            key={a.id}
                            className={`text-[10px] p-1 rounded truncate font-bold cursor-pointer transition-opacity hover:opacity-80 border ${colors.bg} ${colors.text} ${colors.border}`}
                            onClick={() => openEdit(a)}
                            title={`${a.hora_agendamento || ''} ${a.expand?.paciente_id?.nome} - ${a.tipo}`}
                          >
                            {a.hora_agendamento || '---'}{' '}
                            {a.expand?.paciente_id?.nome?.split(' ')[0]}
                          </div>
                        )
                      })}
                      {dayAgendamentos.length > 4 && (
                        <div className="text-[10px] text-zinc-400 font-bold px-1 mt-1 text-center">
                          +{dayAgendamentos.length - 4} mais
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              {/* Desktop List View */}
              <div className="hidden md:block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-950">
                      <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">
                        Data e Hora
                      </TableHead>
                      <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">
                        Paciente
                      </TableHead>
                      <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">
                        Tipo
                      </TableHead>
                      <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">
                        Profissional
                      </TableHead>
                      <TableHead className="font-bold text-zinc-900 dark:text-zinc-100 text-center">
                        Situação
                      </TableHead>
                      <TableHead className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgendamentos.map((a) => {
                      const colors = getStatusColor(a.status)
                      return (
                        <TableRow
                          key={a.id}
                          className="group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-zinc-400" />
                              {format(parseISO(a.data_agendamento), 'dd/MM/yyyy')}
                              {a.hora_agendamento && (
                                <span className="text-primary font-bold ml-1 px-1.5 py-0.5 bg-primary/10 rounded">
                                  {a.hora_agendamento}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-black dark:text-white truncate max-w-[200px]">
                            {a.expand?.paciente_id?.nome}
                          </TableCell>
                          <TableCell className="capitalize font-bold text-zinc-600 dark:text-zinc-400 text-xs">
                            {a.tipo}
                          </TableCell>
                          <TableCell className="text-zinc-600 dark:text-zinc-400 font-semibold text-sm">
                            {a.expand?.profissional_id?.name || a.expand?.profissional_id?.nome}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`${colors.bg} ${colors.text} ${colors.border} capitalize border px-2 py-0.5 shadow-sm font-bold text-[10px]`}
                            >
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-2">
                              {a.status !== 'realizada' && a.status !== 'cancelado' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-700 border-green-300 bg-green-50 hover:bg-green-100 hover:text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-400 font-bold h-8"
                                  onClick={() => handleMarkRealizado(a)}
                                  title="Marcar como realizado"
                                >
                                  <Check className="h-4 w-4 mr-1" /> Realizar
                                </Button>
                              )}
                              {canManage && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  onClick={() => openEdit(a)}
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4 text-zinc-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile List View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredAgendamentos.map((a) => {
                  const colors = getStatusColor(a.status)
                  return (
                    <Card
                      key={a.id}
                      className="overflow-hidden shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-bold text-black dark:text-white truncate pr-2 text-base">
                            {a.expand?.paciente_id?.nome}
                          </div>
                          <Badge
                            className={`${colors.bg} ${colors.text} ${colors.border} capitalize shrink-0 shadow-sm border font-bold text-[10px]`}
                          >
                            {a.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-black dark:text-white bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 mb-3 text-sm">
                          <Clock className="h-4 w-4 text-primary" />
                          {format(parseISO(a.data_agendamento), 'dd/MM/yyyy')}
                          {a.hora_agendamento && (
                            <span className="text-primary ml-auto px-2 py-0.5 bg-primary/10 rounded">
                              {a.hora_agendamento}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              Tratamento
                            </span>
                            <span className="capitalize font-bold text-zinc-700 dark:text-zinc-300">
                              {a.tipo}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              Profissional
                            </span>
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                              {a.expand?.profissional_id?.name ||
                                a.expand?.profissional_id?.nome ||
                                'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800">
                          {a.status !== 'realizada' && a.status !== 'cancelado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:border-green-800 dark:text-green-400 font-bold"
                              onClick={() => handleMarkRealizado(a)}
                            >
                              <Check className="h-4 w-4 mr-1.5" /> Realizar
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="font-bold border border-zinc-200 dark:border-zinc-700"
                              onClick={() => openEdit(a)}
                            >
                              <Edit className="h-4 w-4 mr-1.5" /> Editar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-black dark:text-white">
              Modificar Agendamento
            </DialogTitle>
          </DialogHeader>
          {editingAgendamento && (
            <form onSubmit={handleEdit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-black dark:text-white">Data *</Label>
                  <Input
                    type="date"
                    name="data_agendamento"
                    defaultValue={editingAgendamento.data_agendamento.split('T')[0]}
                    required
                    className="font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-black dark:text-white">Hora</Label>
                  <Input
                    type="time"
                    name="hora_agendamento"
                    defaultValue={editingAgendamento.hora_agendamento}
                    className="font-medium"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-black dark:text-white">
                  Profissional Responsável *
                </Label>
                <Select
                  name="profissional_id"
                  defaultValue={editingAgendamento.profissional_id}
                  required
                >
                  <SelectTrigger className="font-medium">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profissionais.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-black dark:text-white">Situação Atual</Label>
                <Select name="status" defaultValue={editingAgendamento.status}>
                  <SelectTrigger className="font-medium">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado" className="font-semibold">
                      Agendado
                    </SelectItem>
                    <SelectItem value="realizada" className="font-semibold text-green-600">
                      Realizado
                    </SelectItem>
                    <SelectItem value="cancelado" className="font-semibold text-red-600">
                      Cancelado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-black dark:text-white">Observações</Label>
                <Input
                  name="observacoes"
                  defaultValue={editingAgendamento.observacoes}
                  placeholder="Informações adicionais..."
                  className="font-medium"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 font-bold text-base bg-primary text-black hover:bg-primary/90 mt-4 shadow-md"
              >
                Salvar Alterações
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
