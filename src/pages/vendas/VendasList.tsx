import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Plus, Search, Frown, RefreshCw, FileText, Edit } from 'lucide-react'
import VendaForm from './VendaForm'
import { ParcelasModal } from './ParcelasModal'

const statusColor = {
  pendente: 'bg-yellow-100 text-yellow-800',
  parcial: 'bg-blue-100 text-blue-800',
  paga: 'bg-green-100 text-green-800',
}

const formatCurrency = (value: number | undefined) => {
  if (value === undefined || value === null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10).split('-').reverse().join('/')
}

export default function VendasList() {
  const [vendas, setVendas] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { toast } = useToast()

  // Form & Modals state
  const [vendaFormOpen, setVendaFormOpen] = useState(false)
  const [vendaToEdit, setVendaToEdit] = useState<any>(null)
  const [parcelasModalOpen, setParcelasModalOpen] = useState(false)
  const [selectedVenda, setSelectedVenda] = useState<any>(null)

  // Filters
  const [filterVendedor, setFilterVendedor] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await pb.collection('vendas').getFullList({
        expand: 'paciente_id,vendedor_id',
        sort: '-data_venda',
        requestKey: null,
      })
      setVendas(res)

      const v = await pb.collection('users').getFullList({
        filter: "especialidade='vendedor' || papel='vendedor'",
        requestKey: null,
      })
      setVendedores(v)
    } catch (err: any) {
      if (!err.isAbort) {
        setError(true)
        toast({ title: 'Erro ao carregar vendas', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('vendas', loadData)

  const filteredVendas = useMemo(() => {
    return vendas.filter((v) => {
      if (filterVendedor !== 'all' && v.vendedor_id !== filterVendedor) return false
      if (filterStatus !== 'all' && v.status !== filterStatus) return false
      if (filterDateStart && v.data_venda < filterDateStart) return false
      if (filterDateEnd && v.data_venda > filterDateEnd + 'T23:59:59') return false
      return true
    })
  }, [vendas, filterVendedor, filterStatus, filterDateStart, filterDateEnd])

  const openNewVenda = () => {
    setVendaToEdit(null)
    setVendaFormOpen(true)
  }

  const openEditVenda = (v: any) => {
    setVendaToEdit(v)
    setVendaFormOpen(true)
  }

  const openParcelas = (v: any) => {
    setSelectedVenda(v)
    setParcelasModalOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Vendas / Cirurgias</h1>
        <Button onClick={openNewVenda} className="w-full sm:w-auto shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Nova Venda
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">Vendedor</label>
          <Select value={filterVendedor} onValueChange={setFilterVendedor}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name || v.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">Data Início</label>
          <Input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">Data Fim</label>
          <Input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center p-12 text-zinc-500 bg-white dark:bg-zinc-900 border rounded-xl shadow-sm">
          <Frown className="w-12 h-12 mb-4 text-red-400" />
          <p className="text-lg font-bold">Ocorreu um erro ao carregar os dados.</p>
          <Button variant="outline" className="mt-4" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-950">
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-[150px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[80px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[80px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[80px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[80px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-[80px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-[120px]" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredVendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <Search className="w-10 h-10 mb-2 opacity-20" />
                        <p className="mb-4">Nenhuma venda encontrada.</p>
                        <Button onClick={openNewVenda} variant="outline">
                          <Plus className="w-4 h-4 mr-2" /> Nova Venda
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendas.map((v) => (
                    <TableRow
                      key={v.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <TableCell className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {v.expand?.paciente_id?.nome}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                        {v.expand?.vendedor_id?.name || v.expand?.vendedor_id?.nome || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(v.valor_total)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(v.entrada_paga)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(v.saldo_restante)}
                      </TableCell>
                      <TableCell className="text-center">{formatDate(v.data_venda)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`uppercase text-[10px] ${statusColor[v.status as keyof typeof statusColor]}`}
                        >
                          {v.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Editar Venda"
                            onClick={() => openEditVenda(v)}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openParcelas(v)}
                            className="font-semibold"
                          >
                            <FileText className="w-4 h-4 mr-2" /> Parcelas
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col p-4 gap-4 bg-zinc-50 dark:bg-zinc-950">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))
            ) : filteredVendas.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 flex flex-col items-center">
                <p className="mb-4">Nenhuma venda encontrada.</p>
                <Button onClick={openNewVenda} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Nova Venda
                </Button>
              </div>
            ) : (
              filteredVendas.map((v) => (
                <Card key={v.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg">{v.expand?.paciente_id?.nome}</p>
                        <p className="text-xs text-zinc-500">Vend: {v.expand?.vendedor_id?.name}</p>
                      </div>
                      <Badge
                        className={`uppercase text-[10px] ${statusColor[v.status as keyof typeof statusColor]}`}
                      >
                        {v.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-zinc-500 text-xs">Valor Total</p>
                        <p className="font-medium">{formatCurrency(v.valor_total)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">Saldo</p>
                        <p className="font-bold text-primary">{formatCurrency(v.saldo_restante)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">Data</p>
                        <p>{formatDate(v.data_venda)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openEditVenda(v)}
                      >
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => openParcelas(v)}>
                        Parcelas
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {vendaFormOpen && (
        <VendaForm
          isOpen={vendaFormOpen}
          onClose={() => setVendaFormOpen(false)}
          initialData={vendaToEdit}
          onSuccess={() => {
            setVendaFormOpen(false)
            loadData()
          }}
        />
      )}

      {parcelasModalOpen && selectedVenda && (
        <ParcelasModal
          venda={selectedVenda}
          isOpen={parcelasModalOpen}
          onClose={() => setParcelasModalOpen(false)}
        />
      )}
    </div>
  )
}
