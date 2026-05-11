import { useState, useEffect } from 'react'
import { api, Cirurgia, Paciente } from '@/services/db'
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

export default function CirurgiasList() {
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [medicos, setMedicos] = useState<RecordModel[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const loadData = async () => {
    try {
      const [c, p, m] = await Promise.all([
        api.cirurgias.list(),
        api.pacientes.list(),
        api.users.medicos(),
      ])
      setCirurgias(c)
      setPacientes(p)
      setMedicos(m)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('cirurgias', () => loadData())

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const valor = parseFloat(formData.get('valor_total') as string)
    const entrada = parseFloat(formData.get('entrada_paga') as string) || 0

    const data: Partial<Cirurgia> = {
      paciente_id: formData.get('paciente_id') as string,
      medico_id: formData.get('medico_id') as string,
      data_cirurgia: new Date(formData.get('data_cirurgia') as string).toISOString(),
      valor_total: valor,
      entrada_paga: entrada,
      saldo_restante: Math.max(0, valor - entrada),
      status: formData.get('status') as any,
      observacoes: formData.get('observacoes') as string,
    }

    try {
      await api.cirurgias.create(data)
      toast.success('Cirurgia agendada com sucesso')
      setIsDialogOpen(false)
    } catch (error) {
      toast.error('Erro ao agendar cirurgia')
    }
  }

  const handleStatusChange = async (id: string, status: Cirurgia['status']) => {
    try {
      await api.cirurgias.update(id, { status })
      toast.success('Status atualizado')
    } catch (e) {
      toast.error('Erro ao atualizar status')
    }
  }

  const getStatusColor = (status: string) => {
    if (status === 'realizada') return 'bg-green-500'
    if (status === 'cancelada') return 'bg-red-500'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-4 bg-background p-6 rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Gerenciamento de Cirurgias</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Cirurgia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Nova Cirurgia</DialogTitle>
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
                <Label>Médico Responsável *</Label>
                <Select name="medico_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data da Cirurgia *</Label>
                <Input type="date" name="data_cirurgia" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Total (R$) *</Label>
                  <Input type="number" step="0.01" name="valor_total" required />
                </div>
                <div className="space-y-2">
                  <Label>Entrada Paga (R$)</Label>
                  <Input type="number" step="0.01" name="entrada_paga" defaultValue={0} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue="agendada">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="realizada">Realizada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
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
              <TableHead>Médico</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cirurgias.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{format(new Date(c.data_cirurgia), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-medium">{c.expand?.paciente_id?.nome}</TableCell>
                <TableCell>Dr. {c.expand?.medico_id?.name}</TableCell>
                <TableCell>R$ {c.valor_total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge
                    className={`${getStatusColor(c.status)} capitalize text-white hover:${getStatusColor(c.status)}`}
                  >
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Select value={c.status} onValueChange={(v: any) => handleStatusChange(c.id, v)}>
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
            {cirurgias.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Nenhuma cirurgia agendada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
