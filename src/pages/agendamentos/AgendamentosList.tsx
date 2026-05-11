import { useState, useEffect } from 'react'
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
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

export default function AgendamentosList() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<RecordModel[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const loadData = async () => {
    try {
      const [a, p, pr] = await Promise.all([
        api.agendamentos.list(),
        api.pacientes.list(),
        api.users.list(),
      ])
      setAgendamentos(a)
      setPacientes(p)
      setProfissionais(pr)
    } catch {
      // ignore
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
      setIsDialogOpen(false)
    } catch (error) {
      toast.error('Erro ao criar agendamento')
    }
  }

  const getStatusColor = (status: string) => {
    if (status === 'realizada') return 'bg-green-500'
    if (status === 'cancelado') return 'bg-red-500'
    if (status === 'rascunho') return 'bg-gray-400'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-4 bg-background p-6 rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Agenda da Clínica</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Agendamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
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
              <Button type="submit" className="w-full">
                Salvar Agendamento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agendamentos.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  {format(new Date(a.data_agendamento), 'dd/MM/yyyy')}{' '}
                  {a.hora_agendamento && `- ${a.hora_agendamento}`}
                </TableCell>
                <TableCell className="font-medium">{a.expand?.paciente_id?.nome}</TableCell>
                <TableCell className="capitalize">{a.tipo}</TableCell>
                <TableCell>{a.expand?.profissional_id?.name}</TableCell>
                <TableCell>
                  <Badge
                    className={`${getStatusColor(a.status)} capitalize text-white hover:${getStatusColor(a.status)}`}
                  >
                    {a.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {agendamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Nenhum agendamento encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
