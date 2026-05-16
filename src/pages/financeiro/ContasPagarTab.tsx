import { useState, useEffect, useMemo } from 'react'
import {
  getContasPagar,
  updateContaPagar,
  createContaPagar,
  deleteContaPagar,
  type ContaPagar,
} from '@/services/contas_pagar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Search,
  Inbox,
  AlertCircle,
  Edit2,
  Plus,
  Trash2,
  DollarSign,
  AlertOctagon,
  CalendarClock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0)
const formatDt = (d?: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '-')

import pb from '@/lib/pocketbase/client'

export function ContasPagarTab() {
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoriaFilter, setCategoriaFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('vencimento_asc')

  const [isCreating, setIsCreating] = useState(false)
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null)
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null)
  const [contaToDelete, setContaToDelete] = useState<ContaPagar | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [resContas, resCategorias] = await Promise.all([
        getContasPagar(),
        pb.collection('categorias_financeiras').getFullList(),
      ])
      setContas(resContas)
      setCategorias(resCategorias)
    } catch (err) {
      setError('Erro ao carregar despesas. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('contas_pagar', loadData)

  const todayStr = new Date().toISOString().slice(0, 10)
  const next7Days = new Date()
  next7Days.setDate(next7Days.getDate() + 7)
  const next7DaysStr = next7Days.toISOString().slice(0, 10)

  const { totalAPagar, totalVencidas, totalProximos7Dias } = useMemo(() => {
    return contas.reduce(
      (acc, conta) => {
        if (conta.status === 'paga') return acc

        acc.totalAPagar += conta.valor

        const isOverdue =
          conta.status === 'vencida' ||
          (conta.data_vencimento && conta.data_vencimento.slice(0, 10) < todayStr)
        if (isOverdue) {
          acc.totalVencidas += conta.valor
        }

        const isNext7Days =
          !isOverdue &&
          conta.data_vencimento &&
          conta.data_vencimento.slice(0, 10) >= todayStr &&
          conta.data_vencimento.slice(0, 10) <= next7DaysStr
        if (isNext7Days) {
          acc.totalProximos7Dias += conta.valor
        }

        return acc
      },
      { totalAPagar: 0, totalVencidas: 0, totalProximos7Dias: 0 },
    )
  }, [contas, todayStr, next7DaysStr])

  const filtered = useMemo(
    () =>
      contas
        .filter((c) => {
          const dt = c.data_vencimento?.slice(0, 10) || ''
          return (
            (statusFilter === 'all' || c.status === statusFilter) &&
            (categoriaFilter === 'all' ||
              c.categoria === categoriaFilter ||
              c.categoria_id === categoriaFilter) &&
            (!search || c.fornecedor.toLowerCase().includes(search.toLowerCase())) &&
            (!dateFrom || dt >= dateFrom) &&
            (!dateTo || dt <= dateTo)
          )
        })
        .sort((a, b) => {
          if (sortBy === 'vencimento_asc')
            return (a.data_vencimento || '').localeCompare(b.data_vencimento || '')
          if (sortBy === 'vencimento_desc')
            return (b.data_vencimento || '').localeCompare(a.data_vencimento || '')
          if (sortBy === 'fornecedor_asc')
            return (a.fornecedor || '').localeCompare(b.fornecedor || '')
          if (sortBy === 'valor_desc') return b.valor - a.valor
          if (sortBy === 'valor_asc') return a.valor - b.valor
          if (sortBy === 'status') return a.status.localeCompare(b.status)
          return 0
        }),
    [contas, search, statusFilter, categoriaFilter, dateFrom, dateTo, sortBy],
  )

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const catVal = fd.get('categoria') as string
    const isCustomCat = categorias.some((c) => c.id === catVal)
    try {
      await createContaPagar({
        descricao: fd.get('descricao') as string,
        fornecedor: fd.get('fornecedor') as string,
        valor: parseFloat(fd.get('valor') as string),
        categoria: isCustomCat ? 'outros' : (catVal as any),
        categoria_id: isCustomCat ? catVal : '',
        status: 'pendente',
        data_vencimento: `${fd.get('data_vencimento')} 12:00:00.000Z`,
      })
      toast.success('Despesa criada com sucesso')
      setIsCreating(false)
    } catch {
      toast.error('Erro ao criar despesa')
    }
  }

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingConta) return
    const fd = new FormData(e.currentTarget)
    const catVal = fd.get('categoria') as string
    const isCustomCat = categorias.some((c) => c.id === catVal)
    try {
      await updateContaPagar(editingConta.id, {
        descricao: fd.get('descricao') as string,
        fornecedor: fd.get('fornecedor') as string,
        valor: parseFloat(fd.get('valor') as string),
        categoria: isCustomCat ? 'outros' : (catVal as any),
        categoria_id: isCustomCat ? catVal : '',
        data_vencimento: `${fd.get('data_vencimento')} 12:00:00.000Z`,
      })
      toast.success('Despesa atualizada com sucesso')
      setEditingConta(null)
    } catch {
      toast.error('Erro ao atualizar despesa')
    }
  }

  const handlePay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedConta) return
    const fd = new FormData(e.currentTarget)
    try {
      await updateContaPagar(selectedConta.id, {
        status: 'paga',
        valor_pago: parseFloat(fd.get('valor_pago') as string),
        data_pagamento: `${fd.get('data_pagamento')} 12:00:00.000Z`,
        metodo_pagamento: fd.get('metodo') as any,
        observacoes: fd.get('observacoes') as string,
      })
      toast.success('Pagamento registrado com sucesso')
      setSelectedConta(null)
    } catch {
      toast.error('Erro ao registrar pagamento')
    }
  }

  const handleDelete = async () => {
    if (!contaToDelete) return
    try {
      await deleteContaPagar(contaToDelete.id)
      toast.success('Despesa deletada com sucesso')
      setContaToDelete(null)
    } catch {
      toast.error('Erro ao deletar despesa')
    }
  }

  if (error)
    return (
      <div className="p-12 text-center text-destructive">
        <AlertCircle className="mx-auto h-12 w-12 mb-4" />
        <p>{error}</p>
        <Button onClick={loadData} className="mt-4" variant="outline">
          Tentar novamente
        </Button>
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold">Contas a Pagar</h3>
        <Button onClick={() => setIsCreating(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nova Despesa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(totalAPagar)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertOctagon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatBRL(totalVencidas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas 7 dias</CardTitle>
            <CalendarClock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatBRL(totalProximos7Dias)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="paga">Paga</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
            <SelectItem value="aluguel">Aluguel</SelectItem>
            <SelectItem value="fornecedores">Fornecedores</SelectItem>
            <SelectItem value="salarios">Salários</SelectItem>
            <SelectItem value="utilitarios">Utilitários</SelectItem>
            <SelectItem value="taxas_cartao">Taxas de Cartão</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[170px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vencimento_asc">Vencimento (Próx)</SelectItem>
            <SelectItem value="vencimento_desc">Vencimento (Dist)</SelectItem>
            <SelectItem value="fornecedor_asc">Fornecedor (A-Z)</SelectItem>
            <SelectItem value="valor_desc">Valor (Maior)</SelectItem>
            <SelectItem value="valor_asc">Valor (Menor)</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 w-full md:w-auto">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Vencimento de"
            className="w-full md:w-[130px]"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="Vencimento até"
            className="w-full md:w-[130px]"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-4">
            Nenhuma despesa encontrada
          </p>
          <Button onClick={() => setIsCreating(true)}>Nova Despesa</Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-md border bg-white dark:bg-zinc-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const isOverdue =
                    c.status !== 'paga' && c.data_vencimento?.slice(0, 10) < todayStr
                  return (
                    <TableRow key={c.id}>
                      <TableCell className={cn(isOverdue && 'text-red-600 font-semibold')}>
                        {formatDt(c.data_vencimento)}
                      </TableCell>
                      <TableCell className="font-medium">{c.descricao}</TableCell>
                      <TableCell>{c.fornecedor}</TableCell>
                      <TableCell className="capitalize">
                        {c.expand?.categoria_id?.nome || c.categoria?.replace('_', ' ')}
                      </TableCell>
                      <TableCell>{formatBRL(c.valor)}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'capitalize font-medium',
                            c.status === 'paga'
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : c.status === 'vencida' || isOverdue
                                ? 'bg-red-100 text-red-800 hover:bg-red-100'
                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
                          )}
                          variant="secondary"
                        >
                          {c.status === 'pendente' && isOverdue ? 'vencida' : c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Editar"
                          onClick={() => setEditingConta(c)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Deletar"
                          onClick={() => setContaToDelete(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {c.status !== 'paga' && (
                          <Button size="sm" onClick={() => setSelectedConta(c)}>
                            Pagar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 md:hidden">
            {filtered.map((c) => {
              const isOverdue = c.status !== 'paga' && c.data_vencimento?.slice(0, 10) < todayStr
              return (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-base">{c.descricao}</p>
                        <p className="text-sm text-muted-foreground">{c.fornecedor}</p>
                      </div>
                      <Badge
                        className={cn(
                          'capitalize font-medium',
                          c.status === 'paga'
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : c.status === 'vencida' || isOverdue
                              ? 'bg-red-100 text-red-800 hover:bg-red-100'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
                        )}
                        variant="secondary"
                      >
                        {c.status === 'pendente' && isOverdue ? 'vencida' : c.status}
                      </Badge>
                    </div>
                    <div
                      className={cn(
                        'text-sm mb-4',
                        isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground',
                      )}
                    >
                      Venc: {formatDt(c.data_vencimento)} |{' '}
                      {c.expand?.categoria_id?.nome || c.categoria?.replace('_', ' ')}
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="font-bold text-lg">{formatBRL(c.valor)}</p>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" onClick={() => setEditingConta(c)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10"
                          onClick={() => setContaToDelete(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {c.status !== 'paga' && (
                          <Button size="sm" onClick={() => setSelectedConta(c)}>
                            Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Modals */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input name="descricao" required />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Input name="fornecedor" required />
            </div>
            <div className="space-y-2">
              <Label>Valor *</Label>
              <CurrencyInput name="valor" defaultValue={0} />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select name="categoria" required defaultValue="outros">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                  <SelectItem value="aluguel">Aluguel</SelectItem>
                  <SelectItem value="fornecedores">Fornecedores</SelectItem>
                  <SelectItem value="salarios">Salários</SelectItem>
                  <SelectItem value="utilitarios">Utilitários</SelectItem>
                  <SelectItem value="taxas_cartao">Taxas de Cartão</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <Input type="date" name="data_vencimento" required />
            </div>
            <Button type="submit" className="w-full">
              Salvar Despesa
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingConta} onOpenChange={(v) => !v && setEditingConta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input name="descricao" defaultValue={editingConta?.descricao} required />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Input name="fornecedor" defaultValue={editingConta?.fornecedor} required />
            </div>
            <div className="space-y-2">
              <Label>Valor *</Label>
              <CurrencyInput name="valor" defaultValue={editingConta?.valor} />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                name="categoria"
                required
                defaultValue={editingConta?.categoria_id || editingConta?.categoria}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                  <SelectItem value="aluguel">Aluguel</SelectItem>
                  <SelectItem value="fornecedores">Fornecedores</SelectItem>
                  <SelectItem value="salarios">Salários</SelectItem>
                  <SelectItem value="utilitarios">Utilitários</SelectItem>
                  <SelectItem value="taxas_cartao">Taxas de Cartão</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <Input
                type="date"
                name="data_vencimento"
                defaultValue={editingConta?.data_vencimento?.slice(0, 10)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Salvar Despesa
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedConta} onOpenChange={(v) => !v && setSelectedConta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePay} className="space-y-4">
            <div className="p-3 bg-muted rounded-md text-sm mb-4">
              <p>
                <strong>Despesa:</strong> {selectedConta?.descricao}
              </p>
              <p>
                <strong>Valor Devido:</strong> {formatBRL(selectedConta?.valor || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Data do Pagamento *</Label>
              <Input
                type="date"
                name="data_pagamento"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Pago *</Label>
              <CurrencyInput name="valor_pago" defaultValue={selectedConta?.valor} />
            </div>
            <div className="space-y-2">
              <Label>Método de Pagamento *</Label>
              <Select name="metodo" defaultValue="transferencia" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                name="observacoes"
                defaultValue={selectedConta?.observacoes}
                className="resize-none"
              />
            </div>
            <Button type="submit" className="w-full">
              Confirmar Pagamento
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!contaToDelete} onOpenChange={(v) => !v && setContaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta despesa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
