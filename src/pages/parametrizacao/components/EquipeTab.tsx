import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import pb from '@/lib/pocketbase/client'

export default function EquipeTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<any>({
    nome: '',
    email: '',
    telefone: '',
    especialidade: '',
    comissao_padrao: 0,
    ativo: true,
    papel: '',
  })
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const res = await pb.collection('users').getFullList()
      setUsers(res)
    } catch (e) {
      toast({ title: 'Erro ao carregar equipe', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async () => {
    try {
      const data = { ...formData, papel: formData.especialidade }
      if (formData.id) {
        await pb.collection('users').update(formData.id, data)
      } else {
        await pb
          .collection('users')
          .create({ ...data, password: 'password123', passwordConfirm: 'password123' })
      }
      toast({ title: 'Salvo com sucesso', variant: 'default' })
      setOpen(false)
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Membros da Equipe</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() =>
                setFormData({
                  nome: '',
                  email: '',
                  telefone: '',
                  especialidade: '',
                  comissao_padrao: 0,
                  ativo: true,
                })
              }
            >
              Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formData.id ? 'Editar' : 'Novo'} Membro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Especialidade / Papel</Label>
                <Select
                  value={formData.especialidade}
                  onValueChange={(v) => setFormData({ ...formData, especialidade: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="medico">Médico</SelectItem>
                    <SelectItem value="tecnico_cirurgia">Técnico de Cirurgia</SelectItem>
                    <SelectItem value="enfermagem">Enfermagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.especialidade === 'vendedor' && (
                <div className="grid gap-2">
                  <Label>Comissão (%)</Label>
                  <Input
                    type="number"
                    value={formData.comissao_padrao}
                    onChange={(e) =>
                      setFormData({ ...formData, comissao_padrao: Number(e.target.value) })
                    }
                  />
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
                />
                <Label>Ativo</Label>
              </div>
              <Button onClick={handleSave} className="w-full">
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Especialidade</TableHead>
            <TableHead>Comissão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.nome || u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.telefone}</TableCell>
              <TableCell className="capitalize">{u.especialidade || u.papel}</TableCell>
              <TableCell>
                {u.especialidade === 'vendedor' || u.papel === 'vendedor'
                  ? `${u.comissao_padrao || 0}%`
                  : '-'}
              </TableCell>
              <TableCell>{u.ativo ? 'Ativo' : 'Inativo'}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFormData({ ...u, especialidade: u.especialidade || u.papel })
                    setOpen(true)
                  }}
                >
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
