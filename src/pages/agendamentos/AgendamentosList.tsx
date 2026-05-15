import { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Plus,
  Search,
  CalendarX,
  Edit,
  Clock,
  AlertCircle,
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
import { AgendamentoForm } from './components/AgendamentoForm'
import { AgendamentoEditForm } from './components/AgendamentoEditForm'

export default function AgendamentosList() {
  const { user } = useAuth()
  const canManage = ['admin', 'vendedor', 'enfermagem'].includes(user?.papel || '')

  const [agendamentos, setAgendamentos] = useState<RecordModel[]>([])
  const [pacientes, setPacientes] = useState<RecordModel[]>([])
  const [profissionais, setProfissionais] = useState<RecordModel[]>([])
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

  const availableTypes = ['cirurgia', 'tratamento', 'avaliacao', 'retorno']

  const loadData = async () => {
    try {
      setError(false)
      const [a, p, pr] = await Promise.all([
        pb
          .collection('agendamentos')
          .getFullList({
            expand: 'paciente_id,profissional_id,saldo_tratamento_id',
            sort: '-data_agendamento',
          }),
        pb.collection('pacientes').getFullList({ sort: 'nome' }),
        pb
          .collection('users')
          .getFullList({ filter: 'papel="medico" || papel="enfermagem"', sort: 'name' }),
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
  useRealtime('pacientes', () => loadData())

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
      if (a.tipo === 'cirurgia' && a.cirurgia_id) {
        const retornos = await pb
          .collection('agendamentos')
          .getFullList({ filter: `cirurgia_id = "${a.cirurgia_id}" && tipo = "retorno"` })
        if (retornos.length === 0) {
          const dCir = new Date(a.data_agendamento)
          for (const d of [10, 30, 90, 180, 365]) {
            await pb.collection('agendamentos').create({
              paciente_id: a.paciente_id,
              tipo: 'retorno',
              data_agendamento: addDays(dCir, d).toISOString(),
              profissional_id: a.profissional_id,
              status: 'agendado',
              cirurgia_id: a.cirurgia_id,
              observacoes: `Retorno ${d} dias`,
            })
          }
          toast.success('Retornos gerados automaticamente.')
        }
      }
      toast.success('Agendamento marcado como realizado!')
      loadData()
    } catch (error) {
      toast.error('Problema ao atualizar o status.')
    }
  }

  const toggleTypeFilter = (t: string) =>
    setFilterTipos((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const filteredAgendamentos = useMemo(() => {
    let list = agendamentos.filter((a) => {
      if (!a.data_agendamento) return false
      const date = parseISO(a.data_agendamento)
      if (viewMode === 'dia' && !isSameDay(date, currentDate)) return false
      if (viewMode === 'semana' && !isSameWeek(date, currentDate, { weekStartsOn: 1 })) return false
      if (viewMode === 'mes' && !isSameMonth(date, currentDate)) return false
      if (
        search &&
        !(a.expand?.paciente_id?.nome?.toLowerCase() || '').includes(search.toLowerCase())
      )
        return false
      if (filterTipos.length > 0) {
        const isTratamento = ['aplicacao', 'meso', 'prp', 'botox'].includes(a.tipo)
        if (!filterTipos.includes(a.tipo) && !(filterTipos.includes('tratamento') && isTratamento))
          return false
      }
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
        return (a.expand?.profissional_id?.name || '').localeCompare(
          b.expand?.profissional_id?.name || '',
        )
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

  const handlePrev = () =>
    setCurrentDate(
      viewMode === 'dia'
        ? subDays(currentDate, 1)
        : viewMode === 'semana'
          ? subWeeks(currentDate, 1)
          : subMonths(currentDate, 1),
    )
  const handleNext = () =>
    setCurrentDate(
      viewMode === 'dia'
        ? addDays(currentDate, 1)
        : viewMode === 'semana'
          ? addWeeks(currentDate, 1)
          : addMonths(currentDate, 1),
    )

  const formattedDateRange = () => {
    if (viewMode === 'dia') return format(currentDate, "dd 'de' MMMM", { locale: ptBR })
    if (viewMode === 'semana')
      return `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM', { locale: ptBR })} a ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM, yyyy', { locale: ptBR })}`
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
  }

  if (error)
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-white dark:bg-zinc-900 shadow-sm">
        <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
        <h2 className="text-xl font-bold mb-2">Falha ao acessar os dados</h2>
        <Button onClick={loadData} className="font-bold mt-4">
          Tentar novamente
        </Button>
      </div>
    )

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agenda da Clínica</h2>
          <p className="text-zinc-500 font-medium">
            Gerencie e monitore todos os compromissos diários.
          </p>
        </div>
        {canManage && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-md font-bold bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Novo Agendamento</DialogTitle>
              </DialogHeader>
              <AgendamentoForm
                pacientes={pacientes}
                profissionais={profissionais}
                onSuccess={() => {
                  setIsCreateOpen(false)
                  loadData()
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="bg-white dark:bg-zinc-900 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-[120px] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Dia</SelectItem>
                  <SelectItem value="semana">Semana</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-md p-1 border">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="h-8 font-bold px-3 capitalize">
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {viewMode === 'mes' && (
                <div className="hidden sm:flex bg-zinc-100 dark:bg-zinc-800 rounded-md p-1 border">
                  <Button
                    variant={displayStyle === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 font-bold"
                    onClick={() => setDisplayStyle('list')}
                  >
                    <LayoutList className="h-4 w-4 mr-2" /> Lista
                  </Button>
                  <Button
                    variant={displayStyle === 'calendar' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 font-bold"
                    onClick={() => setDisplayStyle('calendar')}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" /> Calendário
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[150px] font-bold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="realizada">Realizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[150px] font-bold">
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
                className="pl-9 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center flex-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 mr-1 hidden sm:block">
                Filtrar:
              </span>
              <ScrollArea className="w-[calc(100vw-2rem)] sm:w-auto whitespace-nowrap pb-2 sm:pb-0">
                <div className="flex gap-2">
                  {availableTypes.map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className={`cursor-pointer capitalize px-3 py-1.5 font-bold transition-all shadow-sm ${filterTipos.includes(t) ? 'bg-primary text-primary-foreground scale-105' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-primary'}`}
                      onClick={() => toggleTypeFilter(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[72px] w-full" />
          <Skeleton className="h-[72px] w-full" />
        </div>
      ) : filteredAgendamentos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-zinc-500 border-dashed border-2 shadow-none">
          <CalendarX className="h-12 w-12 mb-4 text-zinc-400" />
          <p className="text-lg font-bold">Nenhum agendamento</p>
          <p className="text-sm font-medium mt-1 mb-6">
            Ajuste os filtros ou crie um novo compromisso.
          </p>
          {canManage && (
            <Button
              className="font-bold bg-primary text-black"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
            </Button>
          )}
        </Card>
      ) : (
        <>
          {displayStyle === 'calendar' && viewMode === 'mes' ? (
            <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div
                  key={d}
                  className="bg-zinc-100 dark:bg-zinc-900 p-2 text-center text-[10px] font-bold uppercase"
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
                return (
                  <div
                    key={i}
                    className={`min-h-[120px] p-1.5 bg-white dark:bg-zinc-950 ${!isSameMonth(day, currentDate) ? 'opacity-40' : ''}`}
                  >
                    <div
                      className={`font-bold text-xs mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-primary text-primary-foreground' : 'text-zinc-500'}`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayAgendamentos.slice(0, 4).map((a) => {
                        const c = getStatusColor(a.status)
                        return (
                          <div
                            key={a.id}
                            className={`text-[10px] p-1 rounded truncate font-bold cursor-pointer ${c.bg} ${c.text} ${c.border} border`}
                            onClick={() => openEdit(a)}
                          >
                            {a.hora_agendamento || '---'}{' '}
                            {a.expand?.paciente_id?.nome?.split(' ')[0]}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <div className="hidden md:block rounded-xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                <ScrollArea className="h-[600px] w-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-950 z-10">
                      <TableRow>
                        <TableHead className="font-bold">Data e Hora</TableHead>
                        <TableHead className="font-bold">Paciente</TableHead>
                        <TableHead className="font-bold">Tipo</TableHead>
                        <TableHead className="font-bold">Profissional</TableHead>
                        <TableHead className="font-bold text-center">Situação</TableHead>
                        <TableHead className="text-right font-bold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgendamentos.map((a) => {
                        const c = getStatusColor(a.status)
                        return (
                          <TableRow key={a.id} className="hover:bg-zinc-50/80">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-zinc-400" />
                                {format(parseISO(a.data_agendamento), 'dd/MM/yyyy')}
                                {a.hora_agendamento && (
                                  <span className="text-primary font-bold px-1.5 py-0.5 bg-primary/10 rounded">
                                    {a.hora_agendamento}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-bold truncate max-w-[200px]">
                              {a.expand?.paciente_id?.nome}
                            </TableCell>
                            <TableCell className="capitalize font-bold text-xs">{a.tipo}</TableCell>
                            <TableCell className="font-semibold text-sm">
                              {a.expand?.profissional_id?.name || a.expand?.profissional_id?.nome}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={`${c.bg} ${c.text} ${c.border} capitalize font-bold text-[10px]`}
                              >
                                {a.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {a.status !== 'realizada' && a.status !== 'cancelado' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-700 bg-green-50 font-bold h-8"
                                    onClick={() => handleMarkRealizado(a)}
                                  >
                                    <Check className="h-4 w-4 mr-1" /> Realizar
                                  </Button>
                                )}
                                {canManage && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => openEdit(a)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              <ScrollArea className="h-[600px] w-full md:hidden pr-3">
                <div className="grid grid-cols-1 gap-4">
                  {filteredAgendamentos.map((a) => {
                    const c = getStatusColor(a.status)
                    return (
                      <Card key={a.id} className="shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="font-bold truncate pr-2">
                              {a.expand?.paciente_id?.nome}
                            </div>
                            <Badge
                              className={`${c.bg} ${c.text} ${c.border} font-bold text-[10px]`}
                            >
                              {a.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 font-bold bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-md border mb-3 text-sm">
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
                              <span className="block text-[10px] font-bold uppercase text-zinc-400">
                                Tratamento
                              </span>
                              <span className="capitalize font-bold">{a.tipo}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold uppercase text-zinc-400">
                                Profissional
                              </span>
                              <span className="font-semibold truncate">
                                {a.expand?.profissional_id?.name || 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-3 mt-3 border-t">
                            {a.status !== 'realizada' && a.status !== 'cancelado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 bg-green-50 font-bold"
                                onClick={() => handleMarkRealizado(a)}
                              >
                                <Check className="h-4 w-4 mr-1.5" /> Realizar
                              </Button>
                            )}
                            {canManage && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="font-bold"
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
              </ScrollArea>
            </>
          )}
        </>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Modificar Agendamento</DialogTitle>
          </DialogHeader>
          {editingAgendamento && (
            <AgendamentoEditForm
              agendamento={editingAgendamento}
              profissionais={profissionais}
              onSuccess={() => {
                setIsEditOpen(false)
                loadData()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
