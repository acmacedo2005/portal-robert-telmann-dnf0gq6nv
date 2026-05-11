import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'

export default function PacienteHistorico({ pacienteId }: { pacienteId: string }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ agendamentos: [], vendas: [], faturas: [], saldos: [] })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agendamentos, vendas, faturas, saldos] = await Promise.all([
          pb
            .collection('agendamentos')
            .getFullList({
              filter: `paciente_id="${pacienteId}"`,
              sort: '-data_agendamento',
              expand: 'profissional_id',
            }),
          pb
            .collection('vendas')
            .getFullList({ filter: `paciente_id="${pacienteId}"`, sort: '-data_venda' }),
          pb
            .collection('faturas')
            .getFullList({ filter: `paciente_id="${pacienteId}"`, sort: '-data_vencimento' }),
          pb
            .collection('saldo_tratamentos')
            .getFullList({ filter: `paciente_id="${pacienteId}"`, sort: '-created' }),
        ])
        setData({
          agendamentos: agendamentos as never[],
          vendas: vendas as never[],
          faturas: faturas as never[],
          saldos: saldos as never[],
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [pacienteId])

  if (loading) return <Skeleton className="w-full h-64" />

  return (
    <Tabs defaultValue="visitas" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="visitas">Visitas (Agendamentos)</TabsTrigger>
        <TabsTrigger value="vendas">Vendas</TabsTrigger>
        <TabsTrigger value="faturas">Faturas</TabsTrigger>
        <TabsTrigger value="saldo">Saldo de Tratamentos</TabsTrigger>
      </TabsList>

      <TabsContent value="visitas">
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.agendamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Nenhum dado
                  </TableCell>
                </TableRow>
              ) : (
                data.agendamentos.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.data_agendamento), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="capitalize">{item.tipo}</TableCell>
                    <TableCell>{item.expand?.profissional_id?.nome}</TableCell>
                    <TableCell className="capitalize">{item.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="vendas">
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.vendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Nenhum dado
                  </TableCell>
                </TableRow>
              ) : (
                data.vendas.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.data_venda), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="capitalize">{item.tipo?.replace('_', ' ')}</TableCell>
                    <TableCell>R$ {item.valor_total?.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{item.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="faturas">
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.faturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Nenhum dado
                  </TableCell>
                </TableRow>
              ) : (
                data.faturas.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>R$ {item.valor?.toFixed(2)}</TableCell>
                    <TableCell
                      className={`capitalize font-medium ${item.status === 'pendente' ? 'text-orange-500' : item.status === 'paga' ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {item.status}
                    </TableCell>
                    <TableCell>
                      {item.data_pagamento
                        ? format(new Date(item.data_pagamento), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="saldo">
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Total Sessões</TableHead>
                <TableHead>Realizadas</TableHead>
                <TableHead>Restantes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.saldos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Nenhum dado
                  </TableCell>
                </TableRow>
              ) : (
                data.saldos.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="uppercase">{item.tipo_tratamento}</TableCell>
                    <TableCell>{item.sessoes_total}</TableCell>
                    <TableCell>{item.sessoes_realizadas}</TableCell>
                    <TableCell>{item.sessoes_restantes}</TableCell>
                    <TableCell className="capitalize">{item.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}
