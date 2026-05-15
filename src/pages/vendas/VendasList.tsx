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
import pb from '@/lib/pocketbase/client'
import NovaVendaDialog from './NovaVendaDialog'
import ParcelasViewDialog from './ParcelasViewDialog'
import { Plus } from 'lucide-react'

export default function VendasList() {
  const [vendas, setVendas] = useState<any[]>([])
  const [novaOpen, setNovaOpen] = useState(false)
  const [parcelasOpen, setParcelasOpen] = useState(false)
  const [selectedVenda, setSelectedVenda] = useState<string>('')

  const load = async () => {
    const res = await pb
      .collection('vendas')
      .getFullList({ expand: 'paciente_id,vendedor_id', sort: '-created' })
    setVendas(res)
  }
  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <Button onClick={() => setNovaOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nova Venda
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma venda encontrada.
                </TableCell>
              </TableRow>
            ) : (
              vendas.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.expand?.paciente_id?.nome}</TableCell>
                  <TableCell>
                    {v.expand?.vendedor_id?.nome || v.expand?.vendedor_id?.name}
                  </TableCell>
                  <TableCell>R$ {v.valor_total}</TableCell>
                  <TableCell>R$ {v.entrada_paga}</TableCell>
                  <TableCell>R$ {v.saldo_restante}</TableCell>
                  <TableCell>{new Date(v.data_venda).toLocaleDateString()}</TableCell>
                  <TableCell className="capitalize">{v.status}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVenda(v.id)
                        setParcelasOpen(true)
                      }}
                    >
                      Parcelas
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NovaVendaDialog open={novaOpen} setOpen={setNovaOpen} onSave={load} />
      <ParcelasViewDialog open={parcelasOpen} setOpen={setParcelasOpen} vendaId={selectedVenda} />
    </div>
  )
}
