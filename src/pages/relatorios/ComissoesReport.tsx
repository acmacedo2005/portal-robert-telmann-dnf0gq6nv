import { useState, useEffect, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { DollarSign, Search, FileDown } from 'lucide-react'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

export default function ComissoesReport() {
  const [comissoes, setComissoes] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterVendedor, setFilterVendedor] = useState('all')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await pb.collection('comissoes_vendedor').getFullList({
        expand: 'vendedor_id,venda_id.paciente_id',
        sort: '-data_calculo',
        requestKey: null,
      })
      setComissoes(res)

      const v = await pb.collection('users').getFullList({
        filter: "especialidade='vendedor' || papel='vendedor'",
        requestKey: null,
      })
      setVendedores(v)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('comissoes_vendedor', loadData)

  const filtered = useMemo(() => {
    return comissoes.filter((c) => {
      if (filterVendedor !== 'all' && c.vendedor_id !== filterVendedor) return false
      if (filterDateStart && c.data_calculo < filterDateStart) return false
      if (filterDateEnd && c.data_calculo > filterDateEnd + 'T23:59:59') return false
      return true
    })
  }, [comissoes, filterVendedor, filterDateStart, filterDateEnd])

  const totalComissoes = filtered.reduce((acc, c) => acc + c.valor_comissao, 0)
  const totalPagas = filtered
    .filter((c) => c.status === 'paga')
    .reduce((acc, c) => acc + c.valor_comissao, 0)
  const totalPendentes = filtered
    .filter((c) => c.status === 'pendente')
    .reduce((acc, c) => acc + c.valor_comissao, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="text-primary w-6 h-6" /> Relatório de Comissões
        </h1>
        <Button variant="outline" className="shadow-sm">
          <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Total no Período
            </p>
            <p className="text-2xl font-black mt-1 text-zinc-800 dark:text-zinc-200">
              {formatCurrency(totalComissoes)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider">
              Comissões Pagas
            </p>
            <p className="text-2xl font-black mt-1 text-green-700 dark:text-green-400">
              {formatCurrency(totalPagas)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider">
              A Pagar (Pendentes)
            </p>
            <p className="text-2xl font-black mt-1 text-yellow-700 dark:text-yellow-400">
              {formatCurrency(totalPendentes)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">Vendedor</label>
          <Select value={filterVendedor} onValueChange={setFilterVendedor}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Vendedores</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name || v.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">Data Inicial (Cálculo)</label>
          <Input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">Data Final</label>
          <Input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-950">
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead>Venda (Paciente)</TableHead>
                <TableHead className="text-center">Data</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[150px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[40px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[60px]" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p>Nenhum registro encontrado para os filtros aplicados.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {c.expand?.vendedor_id?.nome || c.expand?.vendedor_id?.name}
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">
                      {c.expand?.venda_id?.expand?.paciente_id?.nome ||
                        `Venda #${c.venda_id.substring(0, 6)}`}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {c.data_calculo.slice(0, 10).split('-').reverse().join('/')}
                    </TableCell>
                    <TableCell className="text-right font-medium text-zinc-500">
                      {c.percentual_comissao}%
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(c.valor_comissao)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`uppercase text-[10px] ${c.status === 'paga' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Sum */}
        {!loading && filtered.length > 0 && (
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border-t flex justify-end items-center gap-4">
            <span className="text-sm font-bold text-zinc-500 uppercase">Total Filtrado:</span>
            <span className="text-xl font-black text-primary">
              {formatCurrency(totalComissoes)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
