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

  const filtered = vendas.filter((v) => {
    const matchName = v.expand?.paciente_id?.nome?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = status === 'todos' || v.status === status
    return matchName && matchStatus
  })

  if (error)
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Frown className="h-12 w-12 text-destructive" />
        <p className="text-xl font-medium">Erro ao carregar vendas</p>
        <Button onClick={fetchVendas}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    )

  const getStatusColor = (st: string) => {
    if (st === 'paga') return 'bg-green-100 text-green-800 hover:bg-green-200'
    if (st === 'parcial') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    return 'bg-red-100 text-red-800 hover:bg-red-200'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm border">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Buscar por paciente..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
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
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhuma venda</h3>
          <p className="text-sm">Não há registros correspondentes aos filtros.</p>
          <Button variant="outline" className="mt-4" onClick={() => setIsFormOpen(true)}>
            Nova Venda
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-lg shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor Final</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setEditingData(v)
                      setIsFormOpen(true)
                    }}
                  >
                    <TableCell className="font-medium">{v.expand?.paciente_id?.nome}</TableCell>
                    <TableCell className="text-xs">{formatTipo(v.tipo)}</TableCell>
                    <TableCell>{format(new Date(v.data_venda), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v.valor_final)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v.entrada_paga)}</TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(v.saldo_restante)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getStatusColor(v.status)}>{v.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-4 md:hidden">
            {filtered.map((v) => (
              <Card
                key={v.id}
                className="p-4 cursor-pointer hover:bg-zinc-50"
                onClick={() => {
                  setEditingData(v)
                  setIsFormOpen(true)
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold">{v.expand?.paciente_id?.nome}</div>
                  <Badge className={getStatusColor(v.status)}>{v.status}</Badge>
                </div>
                <div className="text-xs text-zinc-500 mb-3">
                  {formatTipo(v.tipo)} • {format(new Date(v.data_venda), 'dd/MM/yyyy')}
                </div>
                <div className="flex justify-between items-end border-t pt-2">
                  <div>
                    <p className="text-xs text-zinc-500">Valor Final</p>
                    <p className="font-medium">{formatCurrency(v.valor_final)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Saldo Restante</p>
                    <p className="font-medium text-destructive">
                      {formatCurrency(v.saldo_restante)}
                    </p>
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
