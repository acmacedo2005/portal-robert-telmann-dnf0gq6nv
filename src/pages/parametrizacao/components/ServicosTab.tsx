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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Plus, Edit, Trash2, AlertCircle, Syringe } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function ServicosTab() {
  const [servicos, setServicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({
    nome: '',
    descricao: '',
    valor_padrao: 0,
    ativo: true,
  })

  const { toast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await pb.collection('servicos').getFullList({ sort: 'nome' })
      setServicos(res)
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async () => {
    try {
      if (formData.id) await pb.collection('servicos').update(formData.id, formData)
      else await pb.collection('servicos').create(formData)
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
      await pb.collection('servicos').delete(deleteId)
      toast({ title: 'Serviço excluído com sucesso' })
      loadData()
    } catch (e) {
      toast({
        title: 'Erro ao excluir',
        description: 'Pode haver registros vinculados.',
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  if (loading)
    return (
      <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  if (error)
    return (
      <div className="flex flex-col items-center p-8 bg-white rounded-lg border text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <p className="text-red-500 font-medium mb-4">Erro ao carregar serviços.</p>
        <Button onClick={loadData}>Tentar Novamente</Button>
      </div>
    )

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Syringe className="h-5 w-5" /> Serviços e Procedimentos
        </h2>
        <Button
          onClick={() => {
            setFormData({ nome: '', descricao: '', valor_padrao: 0, ativo: true })
            setOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Serviço
        </Button>
      </div>

      {servicos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
          <Syringe className="h-12 w-12 text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium">Nenhum serviço encontrado.</p>
        </div>
      ) : (
        <>
          <div className="grid md:hidden gap-4">
            {servicos.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold">{s.nome}</div>
                    <Badge variant={s.ativo ? 'default' : 'secondary'}>
                      {s.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  {s.descricao && (
                    <div className="text-sm text-muted-foreground">{s.descricao}</div>
                  )}
                  <div className="text-sm font-medium text-primary">
                    {formatCurrency(s.valor_padrao)}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setFormData(s)
                        setOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 hover:text-red-700"
                      onClick={() => setDeleteId(s.id)}
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
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor Padrão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicos.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{s.descricao || '-'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(s.valor_padrao)}</TableCell>
                    <TableCell>
                      <Badge variant={s.ativo ? 'default' : 'secondary'}>
                        {s.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFormData(s)
                          setOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleteId(s.id)}
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
            <DialogTitle>{formData.id ? 'Editar' : 'Novo'} Serviço</DialogTitle>
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
              <Label>Descrição</Label>
              <Input
                value={formData.descricao || ''}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Valor Padrão</Label>
              <CurrencyInput
                value={formData.valor_padrao || 0}
                onValueChange={(v) => setFormData({ ...formData, valor_padrao: v })}
              />
            </div>
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
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso haja registros vinculados, a exclusão falhará.
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
