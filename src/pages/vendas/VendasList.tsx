import { useEffect, useState } from 'react'
import { getVendas } from '@/services/vendas'
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
import { Search, Plus, Frown, RefreshCw, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'
import VendaForm from './VendaForm'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
const formatTipo = (tipo: string) => tipo.replace('_', ' + ').toUpperCase()

export default function VendasList() {
  const [vendas, setVendas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const [sortBy, setSortBy] = useState('data_venda_desc')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)

  const fetchVendas = async () => {
    try {
      setLoading(true)
      setError(false)
      const data = await getVendas()
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

  const filtered = vendas
    .filter((v) => {
      const matchName = v.expand?.paciente_id?.nome?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = status === 'todos' || v.status === status
      return matchName && matchStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'data_venda_asc':
          return new Date(a.data_venda).getTime() - new Date(b.data_venda).getTime()
        case 'paciente_asc':
          return (a.expand?.paciente_id?.nome || '').localeCompare(
            b.expand?.paciente_id?.nome || '',
          )
        case 'paciente_desc':
          return (b.expand?.paciente_id?.nome || '').localeCompare(
            a.expand?.paciente_id?.nome || '',
          )
        case 'valor_desc':
          return b.valor_total - a.valor_total
        case 'valor_asc':
          return a.valor_total - b.valor_total
        case 'status':
          return a.status.localeCompare(b.status)
        case 'data_venda_desc':
        default:
          return new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime()
      }
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
    if (st === 'paga') return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200'
    if (st === 'parcial')
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200'
    return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200'
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
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
            <SelectTrigger className="w-full sm:w-[160px] font-bold h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px] font-bold h-10">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data_venda_desc">Data (Recente)</SelectItem>
              <SelectItem value="data_venda_asc">Data (Antiga)</SelectItem>
              <SelectItem value="paciente_asc">Paciente (A-Z)</SelectItem>
              <SelectItem value="paciente_desc">Paciente (Z-A)</SelectItem>
              <SelectItem value="valor_desc">Valor (Maior)</SelectItem>
              <SelectItem value="valor_asc">Valor (Menor)</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="font-bold shadow-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
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
          <Skeleton className="h-[72px] w-full rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-zinc-50 dark:bg-zinc-950/50 border-dashed border-2 shadow-none">
          <ShoppingCart className="h-12 w-12 mb-4 text-zinc-400" />
          <h3 className="text-lg font-bold text-black dark:text-white">Nenhum registro</h3>
          <p className="text-sm font-medium mb-4">Não há registros correspondentes aos filtros.</p>
          <Button
            className="font-bold bg-primary text-black hover:bg-primary/90"
            onClick={() => {
              setEditingData(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Incluir
          </Button>
        </Card>
      ) : (
        <>
          <div className="hidden lg:block bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-950">
                  <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">
                    Paciente
                  </TableHead>
                  <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">Tipo</TableHead>
                  <TableHead className="font-bold text-zinc-900 dark:text-zinc-100">Data</TableHead>
                  <TableHead className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                    Valor Total
                  </TableHead>
                  <TableHead className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                    Desconto
                  </TableHead>
                  <TableHead className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                    Entrada
                  </TableHead>
                  <TableHead className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                    Saldo
                  </TableHead>
                  <TableHead className="text-center font-bold text-zinc-900 dark:text-zinc-100">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 group"
                    onClick={() => {
                      setEditingData(v)
                      setIsFormOpen(true)
                    }}
                  >
                    <TableCell className="font-bold text-black dark:text-white">
                      {v.expand?.paciente_id?.nome}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      {formatTipo(v.tipo)}
                    </TableCell>
                    <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">
                      {format(new Date(v.data_venda), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(v.valor_total)}
                    </TableCell>
                    <TableCell className="text-right text-red-500 font-medium">
                      {formatCurrency(v.desconto_cortesia || 0)}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="grid gap-4 lg:hidden">
            {filtered.map((v) => (
              <Card
                key={v.id}
                className="p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800"
                onClick={() => {
                  setEditingData(v)
                  setIsFormOpen(true)
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-base text-black dark:text-white truncate pr-2">
                    {v.expand?.paciente_id?.nome}
                  </div>
                  <Badge
                    className={`${getStatusColor(v.status)} uppercase shadow-sm border font-bold text-[10px]`}
                  >
                    {v.status}
                  </Badge>
                </div>
                <div className="text-xs font-bold text-zinc-500 mb-3 bg-zinc-100 dark:bg-zinc-800 inline-block px-2 py-1 rounded">
                  {formatTipo(v.tipo)} • {format(new Date(v.data_venda), 'dd/MM/yyyy')}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-1">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Valor Total
                    </p>
                    <p className="font-semibold text-black dark:text-white">
                      {formatCurrency(v.valor_total)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Desconto
                    </p>
                    <p className="font-semibold text-red-500">
                      {formatCurrency(v.desconto_cortesia || 0)}
                    </p>
                  </div>
                  <div className="pt-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Entrada
                    </p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(v.entrada_paga || 0)}
                    </p>
                  </div>
                  <div className="text-right pt-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Saldo Restante
                    </p>
                    <p className="font-bold text-destructive">{formatCurrency(v.saldo_restante)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      <VendaForm
        isOpen={isFormOpen}
        onClose={setIsFormOpen}
        initialData={editingData}
        onSuccess={() => setIsFormOpen(false)}
      />
    </div>
  )
}
