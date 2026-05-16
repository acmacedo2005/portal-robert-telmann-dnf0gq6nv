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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function EquipeTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await pb.collection('users').getFullList({ sort: 'nome' })
      setUsers(res)
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('users', loadData)

  const resetForm = () =>
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      especialidade: '',
      comissao_padrao: 0,
      ativo: true,
      papel: '',
    })

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
      toast({ title: 'Salvo com sucesso' })
      setOpen(false)
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await pb.collection('users').delete(deleteId)
      toast({ title: 'Membro excluído com sucesso' })
      loadData()
    } catch (e) {
      toast({
        title: 'Erro ao excluir membro',
        description: 'O usuário pode ter registros vinculados.',
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  if (error)
    return (
      <div className="flex flex-col items-center p-8 bg-white rounded-lg border text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <p className="text-red-500 font-medium mb-4">Erro ao carregar equipe.</p>
        <Button onClick={loadData}>Tentar Novamente</Button>
      </div>
    )

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" /> Equipe
        </h2>
        <Button
          onClick={() => {
            resetForm()
            setOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Membro
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <Users className="h-12 w-12 text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium">Nenhum membro encontrado.</p>
        </div>
      ) : (
        <>
          <div className="grid md:hidden gap-4">
            {users.map((u) => (
              <Card key={u.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{u.nome || u.name}</div>
                      <div className="text-sm text-muted-foreground">{u.email}</div>
                    </div>
                    <Badge variant={u.ativo ? 'default' : 'secondary'}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Especialidade: </span>
                    <span className="capitalize">{u.especialidade || u.papel}</span>
                  </div>
                  {(u.especialidade === 'vendedor' || u.papel === 'vendedor') && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Comissão: </span>
                      <span>
                        {Number(u.comissao_padrao || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        %
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setFormData({ ...u, especialidade: u.especialidade || u.papel })
                        setOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 hover:text-red-700"
                      onClick={() => setDeleteId(u.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.nome || u.name}
                      <div className="text-xs text-muted-foreground">{u.telefone}</div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">{u.especialidade || u.papel}</TableCell>
                    <TableCell>
                      {u.especialidade === 'vendedor' || u.papel === 'vendedor'
                        ? `${Number(u.comissao_padrao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.ativo ? 'default' : 'secondary'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFormData({ ...u, especialidade: u.especialidade || u.papel })
                          setOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleteId(u.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Editar' : 'Novo'} Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input
                value={formData.telefone || ''}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Especialidade / Papel</Label>
              <Select
                value={formData.especialidade || ''}
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
                  step="0.01"
                  value={formData.comissao_padrao || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, comissao_padrao: Number(e.target.value) })
                  }
                />
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Switch
                checked={formData.ativo ?? true}
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

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir membro da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O membro perderá o acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
