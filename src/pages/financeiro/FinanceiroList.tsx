import { useState, useEffect } from 'react'
import { api, Fatura } from '@/services/db'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { format } from 'date-fns'
import { DollarSign } from 'lucide-react'

export default function FinanceiroList() {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null)

  const loadData = async () => {
    try {
      const data = await api.faturas.list()
      setFaturas(data)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('faturas', () => loadData())
  useRealtime('pagamentos', () => loadData())

  const handlePagamento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFatura) return
    const formData = new FormData(e.currentTarget)

    const data = {
      fatura_id: selectedFatura.id,
      valor_pago: parseFloat(formData.get('valor_pago') as string),
      data_pagamento: new Date(formData.get('data_pagamento') as string).toISOString(),
      metodo: formData.get('metodo') as any,
      observacoes: formData.get('observacoes') as string,
    }

    try {
      await api.pagamentos.create(data)
      toast.success('Pagamento registrado com sucesso!')
      setSelectedFatura(null)
    } catch (error) {
      toast.error('Erro ao registrar pagamento')
    }
  }

  return (
    <div className="space-y-4 bg-background p-6 rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" /> Faturas e Pagamentos
        </h2>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faturas.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{format(new Date(f.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-medium">{f.expand?.paciente_id?.nome}</TableCell>
                <TableCell className="capitalize">{f.tipo_parcela}</TableCell>
                <TableCell>R$ {f.valor.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      f.status === 'paga'
                        ? 'default'
                        : f.status === 'vencida'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="capitalize"
                  >
                    {f.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {f.status !== 'paga' && (
                    <Button size="sm" variant="outline" onClick={() => setSelectedFatura(f)}>
                      Receber
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {faturas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Nenhuma fatura encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedFatura} onOpenChange={(v) => !v && setSelectedFatura(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePagamento} className="space-y-4 mt-4">
            <div className="p-3 bg-muted rounded-md text-sm mb-4">
              <p>
                <strong>Paciente:</strong> {selectedFatura?.expand?.paciente_id?.nome}
              </p>
              <p>
                <strong>Valor Devido:</strong> R$ {selectedFatura?.valor.toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Data do Pagamento *</Label>
              <Input
                type="date"
                name="data_pagamento"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Pago (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                name="valor_pago"
                defaultValue={selectedFatura?.valor}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Método de Pagamento *</Label>
              <Select name="metodo" defaultValue="transferencia" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferência/PIX</SelectItem>
                  <SelectItem value="cartao">Cartão de Crédito/Débito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input name="observacoes" placeholder="Opcional..." />
            </div>
            <Button type="submit" className="w-full">
              Confirmar Pagamento
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
