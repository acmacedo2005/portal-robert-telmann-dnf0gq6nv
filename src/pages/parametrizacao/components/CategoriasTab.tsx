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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import pb from '@/lib/pocketbase/client'

export default function CategoriasTab() {
  const [categorias, setCategorias] = useState<any[]>([])
  const [formas, setFormas] = useState<any[]>([])
  const [openCat, setOpenCat] = useState(false)
  const [openForma, setOpenForma] = useState(false)
  const [formData, setFormData] = useState<any>({ nome: '', descricao: '', ativo: true })
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [c, f] = await Promise.all([
        pb.collection('categorias_financeiras').getFullList(),
        pb.collection('formas_pagamento').getFullList(),
      ])
      setCategorias(c)
      setFormas(f)
    } catch (e) {
      toast({ title: 'Erro ao carregar', variant: 'destructive' })
    }
  }
  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async (col: string, closeFn: any) => {
    try {
      if (formData.id) await pb.collection(col).update(formData.id, formData)
      else await pb.collection(col).create(formData)
      toast({ title: 'Salvo com sucesso' })
      closeFn(false)
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const renderModal = (title: string, col: string, open: boolean, setOpen: any) => (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {formData.id ? 'Editar' : 'Nova'} {title}
          </DialogTitle>
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
            <Label>Descrição</Label>
            <Input
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.ativo}
              onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
            />
            <Label>Ativo</Label>
          </div>
          <Button onClick={() => handleSave(col, setOpen)} className="w-full">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Categorias de Despesa</h2>
          <Button
            onClick={() => {
              setFormData({ nome: '', descricao: '', ativo: true })
              setOpenCat(true)
            }}
          >
            Nova
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.nome}</TableCell>
                <TableCell>{c.ativo ? 'Ativo' : 'Inativo'}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData(c)
                      setOpenCat(true)
                    }}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {renderModal('Categoria', 'categorias_financeiras', openCat, setOpenCat)}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Formas de Pagamento</h2>
          <Button
            onClick={() => {
              setFormData({ nome: '', descricao: '', ativo: true })
              setOpenForma(true)
            }}
          >
            Nova
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formas.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.nome}</TableCell>
                <TableCell>{f.ativo ? 'Ativo' : 'Inativo'}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData(f)
                      setOpenForma(true)
                    }}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {renderModal('Forma de Pagamento', 'formas_pagamento', openForma, setOpenForma)}
      </div>
    </div>
  )
}
