import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import pb from '@/lib/pocketbase/client'
import PagamentoDialog from './PagamentoDialog'

export default function ParcelasViewDialog({ open, setOpen, vendaId }: any) {
  const [parcelas, setParcelas] = useState<any[]>([])
  const [payModal, setPayModal] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  const load = async () => {
    if (!vendaId) return
    const res = await pb
      .collection('parcelas_venda')
      .getFullList({ filter: `venda_id='${vendaId}'`, expand: 'forma_pagamento_id' })
    setParcelas(res.sort((a, b) => a.numero_parcela - b.numero_parcela))
  }
  useEffect(() => {
    if (open) load()
  }, [open, vendaId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Parcelas da Venda</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcelas.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.numero_parcela}</TableCell>
                <TableCell>{p.data_vencimento}</TableCell>
                <TableCell>R$ {p.valor_parcela}</TableCell>
                <TableCell>{p.expand?.forma_pagamento_id?.nome}</TableCell>
                <TableCell className="capitalize">{p.status}</TableCell>
                <TableCell>
                  {p.status === 'pendente' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelected(p)
                        setPayModal(true)
                      }}
                    >
                      Pagar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <PagamentoDialog open={payModal} setOpen={setPayModal} parcela={selected} onSave={load} />
    </Dialog>
  )
}
