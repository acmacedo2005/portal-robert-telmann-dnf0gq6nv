import { useState, useEffect } from 'react'
import { getCirurgias, createCirurgia, updateCirurgia } from '@/services/cirurgias'
import { getPacientes, createPaciente } from '@/services/pacientes'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
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
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Activity, Search } from 'lucide-react'
import { format } from 'date-fns'

export default function CirurgiasList() {
  const [cirurgias, setCirurgias] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [medicos, setMedicos] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')

  const [isNewPaciente, setIsNewPaciente] = useState(false)
  const [newPacienteData, setNewPacienteData] = useState({ nome: '', telefone: '', email: '' })

  const [formData, setFormData] = useState({
    paciente_id: '',
    medico_id: '',
    tipo: '',
    data_cirurgia: '',
    valor_total: 0,
    status: 'agendada',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [c, p, m] = await Promise.all([
        getCirurgias(),
        getPacientes(),
        pb.collection('users').getFullList({ filter: "papel='medico' || papel='admin'" }),
      ])
      setCirurgias(c)
      setPacientes(p)
      setMedicos(m)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('cirurgias', loadData)
  useRealtime('pacientes', async () => setPacientes(await getPacientes()))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let finalPacienteId = formData.paciente_id

      if (isNewPaciente) {
        if (!newPacienteData.nome) return toast.error('Nome do paciente é obrigatório')
        const p = await createPaciente(newPacienteData)
        finalPacienteId = p.id
      } else if (!finalPacienteId) {
        return toast.error('Selecione ou crie um paciente')
      }

      if (!formData.medico_id) return toast.error('Médico responsável é obrigatório')
      if (!formData.tipo) return toast.error('Tipo de cirurgia é obrigatório')
      if (!formData.data_cirurgia) return toast.error('Data da cirurgia é obrigatória')

      await createCirurgia({
        ...formData,
        paciente_id: finalPacienteId,
        data_cirurgia: new Date(formData.data_cirurgia).toISOString(),
        entrada_paga: 0,
        saldo_restante: formData.valor_total,
      })

      toast.success('Registro criado com sucesso')
      setIsDialogOpen(false)
      setFormData({
        paciente_id: '',
        medico_id: '',
        tipo: '',
        data_cirurgia: '',
        valor_total: 0,
        status: 'agendada',
      })
      setIsNewPaciente(false)
      setNewPacienteData({ nome: '', telefone: '', email: '' })
    } catch (error) {
      toast.error('Erro ao agendar cirurgia')
    }
  }

  const handleStatusChange = async (id: string, novoStatus: string) => {
    try {
      await updateCirurgia(id, { status: novoStatus })
      toast.success('Status atualizado')
    } catch (e) {
      toast.error('Erro ao atualizar status')
    }
  }

  const filtered = cirurgias.filter((c) => {
    const matchName = c.expand?.paciente_id?.nome?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = status === 'todos' || c.status === status
    return matchName && matchStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm border">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Buscar paciente..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="agendada">Agendada</SelectItem>
              <SelectItem value="realizada">Realizada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Incluir
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Agendar Nova Cirurgia</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Paciente *</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={() => setIsNewPaciente(!isNewPaciente)}
                  >
                    {isNewPaciente ? 'Selecionar existente' : 'Criar novo'}
                  </Button>
                </div>
                {isNewPaciente ? (
                  <div className="grid gap-2 border p-3 rounded-md bg-zinc-50 dark:bg-zinc-900">
                    <Input
                      placeholder="Nome completo"
                      value={newPacienteData.nome}
                      onChange={(e) =>
                        setNewPacienteData({ ...newPacienteData, nome: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Telefone"
                      value={newPacienteData.telefone}
                      onChange={(e) =>
                        setNewPacienteData({ ...newPacienteData, telefone: e.target.value })
                      }
                    />
                    <Input
                      type="email"
                      placeholder="E-mail"
                      value={newPacienteData.email}
                      onChange={(e) =>
                        setNewPacienteData({ ...newPacienteData, email: e.target.value })
                      }
                    />
                  </div>
                ) : (
                  <Select
                    value={formData.paciente_id}
                    onValueChange={(v) => setFormData({ ...formData, paciente_id: v })}
                  >
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
                )}
              </div>
              <div className="space-y-2">
                <Label>Médico Responsável *</Label>
                <Select
                  value={formData.medico_id}
                  onValueChange={(v) => setFormData({ ...formData, medico_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        Dr. {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cirurgia *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FUE">FUE</SelectItem>
                      <SelectItem value="FUT">FUT</SelectItem>
                      <SelectItem value="Outra">Outra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Prevista *</Label>
                  <Input
                    type="date"
                    value={formData.data_cirurgia}
                    onChange={(e) => setFormData({ ...formData, data_cirurgia: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.valor_total}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_total: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                Salvar Cirurgia
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Activity className="h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhum registro</h3>
          <p className="text-sm">Não há cirurgias correspondentes aos filtros.</p>
          <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
            Incluir Cirurgia
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-lg shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {format(new Date(c.data_cirurgia), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{c.expand?.paciente_id?.nome}</TableCell>
                    <TableCell className="font-bold text-zinc-600">{c.tipo || '-'}</TableCell>
                    <TableCell>
                      Dr. {c.expand?.medico_id?.name || c.expand?.medico_id?.nome || 'Não definido'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          c.status === 'realizada'
                            ? 'default'
                            : c.status === 'agendada'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className="capitalize"
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select value={c.status} onValueChange={(v) => handleStatusChange(c.id, v)}>
                        <SelectTrigger className="w-[130px] ml-auto h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agendada">Agendada</SelectItem>
                          <SelectItem value="realizada">Realizada</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 md:hidden">
            {filtered.map((c) => (
              <Card key={c.id} className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold">{c.expand?.paciente_id?.nome}</div>
                  <Select value={c.status} onValueChange={(v) => handleStatusChange(c.id, v)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendada">Agendada</SelectItem>
                      <SelectItem value="realizada">Realizada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold uppercase">{c.tipo || '-'}</span> •{' '}
                  {format(new Date(c.data_cirurgia), 'dd/MM/yyyy')}
                </div>
                <div className="text-sm">
                  Resp: Dr. {c.expand?.medico_id?.name || 'Não definido'}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
