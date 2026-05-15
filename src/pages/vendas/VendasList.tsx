import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Frown, RefreshCw, ShoppingCart, Eye } from 'lucide-react'
import { format } from 'date-fns'
import VendaForm from './VendaForm'
import { ParcelasModal } from './ParcelasModal'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

export default function VendasList() {
  const [vendas, setVendas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)

  const [parcelasVenda, setParcelasVenda] = useState<any>(null)

  const fetchVendas = async () => {
    try {
      setLoading(true)
      setError(false)
      const data = await pb
        .collection('vendas')
        .getFullList({ expand: 'paciente_id,vendedor_id', sort: '-created' })
      setVendas(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendas()
  }, [])
  useRealtime('vendas', fetchVendas)

  const filtered = vendas.filter((v) => {
    const matchName = v.expand?.paciente_id?.nome?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = status === 'todos' || v.status === status
    return matchName && matchStatus
  })

  if (error)
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Frown className="h-12 w-12 text-destructive" />
        <p className="text-xl font-bold">Erro ao carregar vendas</p>
        <Button onClick={fetchVendas}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    )

  const getStatusColor = (st: string) => {
    if (st === 'paga') return 'bg-green-100 text-green-800'
    if (st === 'parcial') return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row flex-1 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Buscar por paciente..."
              className="pl-9 h-10 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px] font-bold h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="font-bold shadow-md"
          onClick={() => {
            setEditingData(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Venda
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-zinc-500 border-dashed border-2 shadow-none">
          <ShoppingCart className="h-12 w-12 mb-4 text-zinc-400" />
          <h3 className="text-lg font-bold text-black dark:text-white">Nenhum registro</h3>
          <p className="text-sm font-medium mb-4">Não há registros correspondentes aos filtros.</p>
        </Card>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-950">
                <TableHead className="font-bold">Paciente</TableHead>
                <TableHead className="font-bold">Vendedor</TableHead>
                <TableHead className="font-bold">Data</TableHead>
                <TableHead className="text-right font-bold">Total</TableHead>
                <TableHead className="text-right font-bold">Entrada</TableHead>
                <TableHead className="text-right font-bold">Saldo</TableHead>
                <TableHead className="text-center font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Parcelas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <TableCell
                    className="font-bold cursor-pointer"
                    onClick={() => {
                      setEditingData(v)
                      setIsFormOpen(true)
                    }}
                  >
                    {v.expand?.paciente_id?.nome}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-zinc-500">
                    {v.expand?.vendedor_id?.name || 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {format(new Date(v.data_venda), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(v.valor_total)}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {formatCurrency(v.entrada_paga)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-destructive">
                    {formatCurrency(v.saldo_restante)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={`${getStatusColor(v.status)} uppercase shadow-sm border font-bold text-[10px]`}
                    >
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => setParcelasVenda(v)}
                    >
                      <Eye className="w-4 h-4 mr-1" /> Ver Parcelas
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VendaForm
        isOpen={isFormOpen}
        onClose={setIsFormOpen}
        initialData={editingData}
        onSuccess={() => setIsFormOpen(false)}
      />
      <ParcelasModal
        venda={parcelasVenda}
        isOpen={!!parcelasVenda}
        onClose={() => setParcelasVenda(null)}
      />
    </div>
  )
}
