import { useState, useEffect } from 'react'
import { api, Tratamento, Paciente } from '@/services/db'
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

export default function TratamentosList() {
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const loadData = async () => {
    try {
      const [t, p] = await Promise.all([api.tratamentos.list(), api.pacientes.list()])
      setTratamentos(t)
      setPacientes(p)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('tratamentos', () => loadData())

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const data: Partial<Tratamento> = {
      paciente_id: formData.get('paciente_id') as string,
      tipo_tratamento: formData.get('tipo_tratamento') as any,
      data_inicio: new Date(formData.get('data_inicio') as string).toISOString(),
      status: 'ativo',
      sessoes_total: parseInt(formData.get('sessoes_total') as string) || 0,
      sessoes_realizadas: 0,
      valor_total: parseFloat(formData.get('valor_total') as string) || 0,
    }

    try {
      await api.tratamentos.create(data)
      toast.success('Tratamento registrado com sucesso')
      setIsDialogOpen(false)
    } catch (error) {
      toast.error('Erro ao registrar tratamento')
    }
  }

  const getStatusColor = (status: string) => {
    if (status === 'concluido') return 'bg-green-500'
    if (status === 'cancelado') return 'bg-red-500'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-4 bg-background p-6 rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Gestão de Tratamentos</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Tratamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Tratamento</DialogTitle>
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
                <Label>Tipo de Tratamento *</Label>
                <Select name="tipo_tratamento" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meso">Mesoterapia (Meso)</SelectItem>
                    <SelectItem value="prp">PRP</SelectItem>
                    <SelectItem value="botox">Botox Capilar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Input type="date" name="data_inicio" required />
                </div>
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
                  <Input type="number" step="0.01" name="valor_total" />
                </div>
                <div className="space-y-2">
                  <Label>Sessões (Total)</Label>
                  <Input type="number" name="sessoes_total" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Salvar Tratamento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Sessões</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tratamentos.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.expand?.paciente_id?.nome}</TableCell>
                <TableCell className="uppercase">{t.tipo_tratamento}</TableCell>
                <TableCell>
                  {t.data_inicio ? format(new Date(t.data_inicio), 'dd/MM/yyyy') : '-'}
                </TableCell>
                <TableCell>
                  {t.sessoes_realizadas || 0} / {t.sessoes_total || 0}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${getStatusColor(t.status)} capitalize text-white hover:${getStatusColor(t.status)}`}
                  >
                    {t.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {tratamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Nenhum tratamento registrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
