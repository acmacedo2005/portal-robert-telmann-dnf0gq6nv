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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Plus,
  Search,
  CalendarX,
  CheckCircle,
  Edit,
  Clock,
  AlertCircle,
  UserPlus,
  Check,
} from 'lucide-react'
import { format, isToday, isSameWeek, isSameMonth, parseISO } from 'date-fns'
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
  const [currentTab, setCurrentTab] = useState('mes')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingAgendamento, setEditingAgendamento] = useState<RecordModel | null>(null)

  const [isCreatingPatient, setIsCreatingPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ nome: '', telefone: '', email: '' })
  const [selectedPacienteId, setSelectedPacienteId] = useState<string>('novo')
  const [selectedTipo, setSelectedTipo] = useState('')

  const availableTypes = ['meso', 'prp', 'botox', 'cirurgia', 'avaliacao', 'retorno']

  const loadData = async () => {
    try {
      setError(false)
      const [a, p, pr, s] = await Promise.all([
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
      toast.error('Erro ao carregar dados do servidor. Tente novamente mais tarde.')
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
        toast.error('O nome do paciente é obrigatório para um novo cadastro.')
        return
      }
      try {
        const p = await pb.collection('pacientes').create(newPatient)
        pId = p.id
      } catch (err) {
        toast.error('Erro ao cadastrar novo paciente. Verifique as informações fornecidas.')
        return
      }
    }

    if (!pId || pId === 'novo') {
      toast.error('Selecione ou cadastre um paciente para prosseguir.')
      return
    }

    const tipo = formData.get('tipo') as string
    const saldo_tratamento_id = formData.get('saldo_tratamento_id') as string

    if (['aplicacao', 'meso', 'prp', 'botox'].includes(tipo) && !saldo_tratamento_id) {
      toast.error('Um Saldo de Tratamento vinculado é obrigatório para este tipo de procedimento.')
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
      toast.success('Agendamento criado com sucesso')
      setIsCreateOpen(false)
      setIsCreatingPatient(false)
      setNewPatient({ nome: '', telefone: '', email: '' })
      setSelectedPacienteId('novo')
      setSelectedTipo('')
    } catch (error) {
      toast.error('Falha ao criar o agendamento no banco de dados.')
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
      toast.success('Status do agendamento atualizado para Realizado!')
    } catch (error) {
      toast.error('Problema ao atualizar o status do agendamento.')
    }
  }

  const toggleTypeFilter = (t: string) => {
    setFilterTipos((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const filteredAgendamentos = useMemo(() => {
    let list = agendamentos.filter((a) => {
      if (!a.data_agendamento) return false
      const date = parseISO(a.data_agendamento)
      const now = new Date()

      if (currentTab === 'dia' && !isToday(date)) return false
      if (currentTab === 'semana' && !isSameWeek(date, now, { weekStartsOn: 1 })) return false
      if (currentTab === 'mes' && !isSameMonth(date, now)) return false

      const pacienteNome = a.expand?.paciente_id?.nome?.toLowerCase() || ''
      if (search && !pacienteNome.includes(search.toLowerCase())) return false

      if (filterTipos.length > 0 && !filterTipos.includes(a.tipo)) return false
      if (filterStatus !== 'todos' && a.status !== filterStatus) return false

      return true
    })

    // Sort appropriately
    return list.sort(
      (a, b) => new Date(b.data_agendamento).getTime() - new Date(a.data_agendamento).getTime(),
    )
  }, [agendamentos, currentTab, search, filterTipos, filterStatus])

  const getStatusColor = (status: string) => {
    if (status === 'realizada')
      return 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-black border-transparent'
    if (status === 'cancelado')
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800'
    if (status === 'rascunho')
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-100'
    return 'bg-primary/20 text-primary border-primary/30'
  }

  const openEdit = (a: RecordModel) => {
    setEditingAgendamento(a)
    setIsEditOpen(true)
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
        <p className="text-zinc-500 font-medium mb-4">
          Tivemos um problema ao comunicar com o servidor.
        </p>
        <Button onClick={loadData} className="font-bold">
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
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
                          placeholder="João da Silva"
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
                          placeholder="(11) 99999-9999"
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

                {['meso', 'prp', 'botox', 'aplicacao'].includes(selectedTipo) && (
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
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 md:w-[400px] bg-zinc-100 dark:bg-zinc-800">
              <TabsTrigger
                value="dia"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm font-bold text-xs md:text-sm"
              >
                Dia
              </TabsTrigger>
              <TabsTrigger
                value="semana"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm font-bold text-xs md:text-sm"
              >
                Semana
              </TabsTrigger>
              <TabsTrigger
                value="mes"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm font-bold text-xs md:text-sm"
              >
                Mês
              </TabsTrigger>
              <TabsTrigger
                value="todos"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm font-bold text-xs md:text-sm"
              >
                Todos
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar por paciente..."
                className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[160px] h-10 bg-zinc-50 dark:bg-zinc-950 font-bold border-zinc-200 dark:border-zinc-800">
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
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 items-center">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 mr-1">
              Filtrar:
            </span>
            {availableTypes.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className={`cursor-pointer capitalize px-3 py-1 font-bold transition-all shadow-sm ${filterTipos.includes(t) ? 'bg-primary text-black border-primary scale-105' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-primary border-zinc-200 dark:border-zinc-700'}`}
                onClick={() => toggleTypeFilter(t)}
              >
                {t}
              </Badge>
            ))}
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
          <p className="text-lg font-bold text-black dark:text-white">
            Nenhum agendamento encontrado
          </p>
          <p className="text-sm font-medium mt-1">Ajuste os filtros ou crie um novo compromisso.</p>
          {canManage && (
            <Button
              className="mt-6 font-bold bg-primary text-black hover:bg-primary/90 shadow-md"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Agendar Agora
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden md:block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-950">
                  <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">
                    Data e Hora
                  </TableHead>
                  <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">
                    Paciente
                  </TableHead>
                  <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">Tipo</TableHead>
                  <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">
                    Profissional
                  </TableHead>
                  <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">
                    Situação
                  </TableHead>
                  <TableHead className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                    Ações Rápidas
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgendamentos.map((a) => (
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
                    <TableCell className="font-bold text-black dark:text-white">
                      {a.expand?.paciente_id?.nome}
                    </TableCell>
                    <TableCell className="capitalize font-bold text-zinc-700 dark:text-zinc-300">
                      {a.tipo}
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400 font-semibold">
                      {a.expand?.profissional_id?.name || a.expand?.profissional_id?.nome}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${getStatusColor(a.status)} capitalize border px-2.5 py-0.5 shadow-sm font-bold`}
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
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredAgendamentos.map((a) => (
              <Card
                key={a.id}
                className="overflow-hidden shadow-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <CardHeader className="pb-3 pt-4 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-base flex justify-between items-start gap-2">
                    <span className="font-bold text-black dark:text-white truncate">
                      {a.expand?.paciente_id?.nome}
                    </span>
                    <Badge
                      className={`${getStatusColor(a.status)} capitalize shrink-0 shadow-sm border font-bold`}
                    >
                      {a.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3 pt-3">
                  <div className="flex items-center gap-2 font-bold text-black dark:text-white bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <Clock className="h-4 w-4 text-primary" />
                    {format(parseISO(a.data_agendamento), 'dd/MM/yyyy')}
                    {a.hora_agendamento && (
                      <span className="text-primary ml-auto px-2 py-0.5 bg-primary/10 rounded">
                        {a.hora_agendamento}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-zinc-400">
                        Tratamento
                      </span>
                      <span className="capitalize text-zinc-900 dark:text-zinc-100 font-bold">
                        {a.tipo}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-zinc-400">
                        Profissional
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
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
            ))}
          </div>
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
