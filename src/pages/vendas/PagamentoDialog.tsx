import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import pb from '@/lib/pocketbase/client'

export default function PagamentoDialog({ open, setOpen, parcela, onSave }: any) {
  const [form, setForm] = useState<any>({
    valor_pago: parcela?.valor_parcela || 0,
    data_pagamento: new Date().toISOString().split('T')[0],
    taxa_percentual: 0,
  })
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      const valor_taxa = (form.valor_pago * form.taxa_percentual) / 100
      await pb.collection('parcelas_venda').update(parcela.id, {
        status: 'paga',
        data_pagamento: form.data_pagamento,
        taxa_percentual: form.taxa_percentual,
        valor_taxa,
        valor_liquido: form.valor_pago - valor_taxa,
      })
      toast({ title: 'Operação realizada com sucesso' })
      setOpen(false)
      onSave()
    } catch (e) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const emitirRecibo = () => {
    const html = `<html><head><title>Recibo</title></head><body style="font-family:sans-serif;padding:40px">
      <h2>Recibo de Pagamento - Parcela ${parcela?.numero_parcela}</h2>
      <p><strong>Valor:</strong> R$ ${form.valor_pago}</p>
      <p><strong>Data:</strong> ${form.data_pagamento}</p>
      <hr/><p>Clínica Capilar Telmann</p>
      <script>window.print()</script>
    </body></html>`
    const win = window.open('', '_blank')
    win?.document.write(html)
  }

  if (!parcela) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento Parcela {parcela.numero_parcela}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Valor Pago (R$)</Label>
            <Input
              type="number"
              value={form.valor_pago}
              onChange={(e) => setForm({ ...form, valor_pago: Number(e.target.value) })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Data Pagamento</Label>
            <Input
              type="date"
              value={form.data_pagamento}
              onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Taxa Cartão (%)</Label>
            <Input
              type="number"
              value={form.taxa_percentual}
              onChange={(e) => setForm({ ...form, taxa_percentual: Number(e.target.value) })}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">
              Salvar
            </Button>
            <Button onClick={emitirRecibo} variant="outline" className="flex-1">
              Emitir Recibo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
