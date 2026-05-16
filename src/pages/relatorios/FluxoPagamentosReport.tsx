import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingDown, Clock, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function FluxoPagamentosReport() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await pb.collection('fluxo_pagamentos').getFullList({
          sort: 'vencimento',
        })
        setRecords(data)
      } catch (err) {
        console.error('Erro ao buscar fluxo de pagamentos:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const formatDate = (val: string) => {
    if (!val) return '-'
    return new Intl.DateTimeFormat('pt-BR').format(new Date(val))
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const totalRecords = records.length

  const totalPaid = records.filter((r) => r.status === 'pago').reduce((acc, r) => acc + r.valor, 0)

  const totalToPay = records
    .filter((r) => r.status !== 'pago' && r.status !== 'cancelado')
    .reduce((acc, r) => acc + r.valor, 0)

  const overdueRecords = records.filter((r) => {
    if (r.status !== 'pendente') return false
    const v = new Date(r.vencimento)
    v.setHours(0, 0, 0, 0)
    return v < now
  })

  const overdueCount = overdueRecords.length
  const overdueSum = overdueRecords.reduce((acc, r) => acc + r.valor, 0)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" asChild>
          <Link to="/importacao">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-orange-600" />
            Relatório de Fluxo de Pagamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Resumo consolidado das obrigações e contas registradas no fluxo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Importado</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
            <p className="text-xs text-muted-foreground">Registros na base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalToPay)}</div>
            <p className="text-xs text-muted-foreground">Obrigações pendentes/vencidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">Contas liquidadas</p>
          </CardContent>
        </Card>

        <Card className={overdueCount > 0 ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              Pagamentos Atrasados
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(overdueSum)}
            </div>
            <p className="text-xs font-medium text-red-600/80 dark:text-red-400/80">
              {overdueCount} {overdueCount === 1 ? 'registro vencido' : 'registros vencidos'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento do Fluxo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => {
                    const isOverdue = r.status === 'pendente' && new Date(r.vencimento) < now
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{formatDate(r.vencimento)}</TableCell>
                        <TableCell>{r.fornecedor}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={r.observacoes}>
                          {r.observacoes || '-'}
                        </TableCell>
                        <TableCell>
                          {r.status === 'pago' && (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                              Pago
                            </Badge>
                          )}
                          {r.status === 'cancelado' && <Badge variant="secondary">Cancelado</Badge>}
                          {r.status === 'pendente' && !isOverdue && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Pendente
                            </Badge>
                          )}
                          {(r.status === 'vencido' || isOverdue) && (
                            <Badge variant="destructive">Vencido</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(r.valor)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
