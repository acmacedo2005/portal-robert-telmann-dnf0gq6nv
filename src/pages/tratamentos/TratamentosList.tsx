import { useState, useEffect } from 'react'
import { getTratamentos, createTratamento, updateTratamento } from '@/services/tratamentos'
import { getPacientes, createPaciente } from '@/services/pacientes'
import { useRealtime } from '@/hooks/use-realtime'
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
import { Plus, CheckCircle, Pill, Search } from 'lucide-react'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'

export default function TratamentosList() {
  const [tratamentos, setTratamentos] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')

  const [isNewPaciente, setIsNewPaciente] = useState(false)
  const [newPacienteData, setNewPacienteData] = useState({ nome: '', telefone: '', email: '' })
  const [formData, setFormData] = useState({
    paciente_id: '',
    tipo_tratamento: '',
    data_inicio: '',
    sessoes_total: 1,
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [t, p] = await Promise.all([getTratamentos(), getPacientes()])
      setTratamentos(t)
      setPacientes(p)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('tratamentos', loadData)
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

      if (!formData.tipo_tratamento) return toast.error('Selecione o tipo de tratamento')
      if (!formData.data_inicio) return toast.error('Data de início é obrigatória')

      await createTratamento({
        paciente_id: finalPacienteId,
        tipo_tratamento: formData.tipo_tratamento,
        data_inicio: new Date(formData.data_inicio).toISOString(),
        status: 'ativo',
        sessoes_total: formData.sessoes_total,
        sessoes_realizadas: 0,
      })

      toast.success('Registro criado com sucesso')
      setIsDialogOpen(false)
      setFormData({ paciente_id: '', tipo_tratamento: '', data_inicio: '', sessoes_total: 1 })
      setIsNewPaciente(false)
      setNewPacienteData({ nome: '', telefone: '', email: '' })
    } catch (error) {
      toast.error('Erro ao registrar tratamento')
    }
  }

  const handleMarcarRealizado = async (t: any) => {
    try {
      const newRealizadas = t.sessoes_realizadas + 1
      const isConcluido = newRealizadas >= t.sessoes_total
      await updateTratamento(t.id, {
        sessoes_realizadas: newRealizadas,
        status: isConcluido ? 'concluido' : 'ativo',
      })

      const saldos = await pb.collection('saldo_tratamentos').getFullList({
        filter: `paciente_id='${t.paciente_id}' && tipo_tratamento='${t.tipo_tratamento}' && status='ativo'`,
      })
      for (const s of saldos) {
        if (s.sessoes_restantes > 0) {
          const rest = s.sessoes_restantes - 1
          await pb.collection('saldo_tratamentos').update(s.id, {
            sessoes_realizadas: s.sessoes_realizadas + 1,
            sessoes_restantes: rest,
            status: rest === 0 ? 'concluido' : 'ativo',
          })
          break
        }
      }

      toast.success('Sessão registrada com sucesso')
    } catch (e) {
      toast.error('Erro ao atualizar sessão')
    }
  }

  const filtered = tratamentos.filter((t) => {
    const matchName = t.expand?.paciente_id?.nome?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = status === 'todos' || t.status === status
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
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
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
              <DialogTitle>Incluir Tratamento</DialogTitle>
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
                <Label>Tipo de Tratamento *</Label>
                <Select
                  value={formData.tipo_tratamento}
                  onValueChange={(v) => setFormData({ ...formData, tipo_tratamento: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meso">Mesoterapia</SelectItem>
                    <SelectItem value="prp">PRP</SelectItem>
                    <SelectItem value="botox">Botox Capilar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total de Sessões *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.sessoes_total}
                    onChange={(e) =>
                      setFormData({ ...formData, sessoes_total: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Salvar Tratamento
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
          <Pill className="h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhum registro</h3>
          <p className="text-sm">Não há tratamentos correspondentes aos filtros.</p>
          <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
            Incluir Tratamento
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-lg shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead className="text-center">Progresso (Sessões)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.expand?.paciente_id?.nome}</TableCell>
                    <TableCell className="uppercase text-xs font-bold text-zinc-600">
                      {t.tipo_tratamento}
                    </TableCell>
                    <TableCell>
                      {t.data_inicio ? format(new Date(t.data_inicio), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-primary">
                        {t.sessoes_realizadas || 0}
                      </span>{' '}
                      / {t.sessoes_total}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          t.status === 'concluido'
                            ? 'default'
                            : t.status === 'ativo'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className="capitalize"
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === 'ativo' && t.sessoes_realizadas < t.sessoes_total && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarcarRealizado(t)}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" /> Realizado
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 md:hidden">
            {filtered.map((t) => (
              <Card key={t.id} className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold">{t.expand?.paciente_id?.nome}</div>
                  <Badge
                    variant={
                      t.status === 'concluido'
                        ? 'default'
                        : t.status === 'ativo'
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="capitalize"
                  >
                    {t.status}
                  </Badge>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="uppercase font-bold">{t.tipo_tratamento}</span> • Início:{' '}
                  {t.data_inicio ? format(new Date(t.data_inicio), 'dd/MM/yyyy') : '-'}
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <div className="text-sm">
                    Progresso: <span className="font-bold">{t.sessoes_realizadas || 0}</span> /{' '}
                    {t.sessoes_total}
                  </div>
                  {t.status === 'ativo' && t.sessoes_realizadas < t.sessoes_total && (
                    <Button variant="outline" size="sm" onClick={() => handleMarcarRealizado(t)}>
                      Realizado
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
