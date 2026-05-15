import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import pb from '@/lib/pocketbase/client'

export default function ComissoesReport() {
  const [comissoes, setComissoes] = useState<any[]>([])

  useEffect(() => {
    pb.collection('comissoes_vendedor')
      .getFullList({ expand: 'vendedor_id,venda_id.paciente_id' })
      .then(setComissoes)
  }, [])

  const total = comissoes.reduce((acc, c) => acc + c.valor_comissao, 0)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Relatório de Comissões</h1>
      <div className="bg-white rounded-lg shadow border overflow-hidden p-4">
        <h2 className="text-lg font-semibold mb-4">Total: R$ {total.toFixed(2)}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Comissão (%)</TableHead>
              <TableHead>Valor (R$)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoes.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.expand?.vendedor_id?.nome || c.expand?.vendedor_id?.name}</TableCell>
                <TableCell>{c.expand?.venda_id?.expand?.paciente_id?.nome}</TableCell>
                <TableCell>{new Date(c.data_calculo).toLocaleDateString()}</TableCell>
                <TableCell>{c.percentual_comissao}%</TableCell>
                <TableCell>R$ {c.valor_comissao?.toFixed(2)}</TableCell>
                <TableCell className="capitalize">{c.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
