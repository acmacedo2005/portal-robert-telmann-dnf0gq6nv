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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, AlertCircle, FolderDot } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function CategoriasTab() {
  const [categorias, setCategorias] = useState<any[]>([])
  const [formas, setFormas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('despesas')
  const [deleteData, setDeleteData] = useState<{ id: string; col: string } | null>(null)
  const [formData, setFormData] = useState<any>({ nome: '', descricao: '', ativo: true })

  const { toast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const [c, f] = await Promise.all([
        pb.collection('categorias_financeiras').getFullList({ sort: 'nome' }),
        pb.collection('formas_pagamento').getFullList({ sort: 'nome' }),
      ])
      setCategorias(c)
      setFormas(f)
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('categorias_financeiras', loadData)
  useRealtime('formas_pagamento', loadData)

  const handleSave = async () => {
    const col = activeTab === 'despesas' ? 'categorias_financeiras' : 'formas_pagamento'
    try {
      if (formData.id) await pb.collection(col).update(formData.id, formData)
      else await pb.collection(col).create(formData)
      toast({ title: 'Salvo com sucesso' })
      setOpen(false)
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteData) return
    try {
      await pb.collection(deleteData.col).delete(deleteData.id)
      toast({ title: 'Excluído com sucesso' })
      loadData()
    } catch (e) {
      toast({
        title: 'Erro ao excluir',
        description: 'Pode haver registros vinculados.',
        variant: 'destructive',
      })
    } finally {
      setDeleteData(null)
    }
  }

  const renderContent = (items: any[], col: string, title: string) => {
    if (items.length === 0)
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-zinc-50 dark:bg-zinc-900/50 mt-4">
          <FolderDot className="h-12 w-12 text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium">Nenhum registro encontrado em {title}.</p>
        </div>
      )
    return (
      <div className="mt-4">
        <div className="grid md:hidden gap-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="font-semibold">{item.nome}</div>
                  <Badge variant={item.ativo ? 'default' : 'secondary'}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {item.descricao && (
                  <div className="text-sm text-muted-foreground">{item.descricao}</div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setFormData(item)
                      setOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => setDeleteData({ id: item.id, col })}
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{item.descricao || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={item.ativo ? 'default' : 'secondary'}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData(item)
                        setOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setDeleteData({ id: item.id, col })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

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
        <p className="text-red-500 font-medium mb-4">Erro ao carregar categorias.</p>
        <Button onClick={loadData}>Tentar Novamente</Button>
      </div>
    )

  const entityName = activeTab === 'despesas' ? 'Categoria' : 'Forma de Pagamento'

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderDot className="h-5 w-5" /> Categorias Financeiras
        </h2>
        <Button
          onClick={() => {
            setFormData({ nome: '', descricao: '', ativo: true })
            setOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Nova {entityName}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="formas">Formas de Pagamento</TabsTrigger>
        </TabsList>
        <TabsContent value="despesas">
          {renderContent(categorias, 'categorias_financeiras', 'Categorias de Despesa')}
        </TabsContent>
        <TabsContent value="formas">
          {renderContent(formas, 'formas_pagamento', 'Formas de Pagamento')}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formData.id ? 'Editar' : 'Nova'} {entityName}
            </DialogTitle>
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

      <AlertDialog open={!!deleteData} onOpenChange={(v) => !v && setDeleteData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
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
