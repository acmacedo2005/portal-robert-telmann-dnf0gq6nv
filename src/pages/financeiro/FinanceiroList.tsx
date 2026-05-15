import { useState, useEffect, useMemo } from 'react'
import { getFaturas, updateFatura, type Fatura } from '@/services/faturas'
import { createPagamento } from '@/services/pagamentos'
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
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { DollarSign, Search, Inbox, AlertCircle, Edit2 } from 'lucide-react'

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
const formatDt = (d?: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '-')

export default function FinanceiroList() {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('vencimento_asc')

  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null)
  const [editingFatura, setEditingFatura] = useState<Fatura | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      setFaturas(await getFaturas())
    } catch (err) {
      setError('Falha ao carregar as faturas. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('faturas', loadData)
  useRealtime('pagamentos', loadData)

  const filteredAndSorted = useMemo(() => {
    return faturas
      .filter((f) => {
        const dtStr = f.data_vencimento?.slice(0, 10) || ''
        return (
          (statusFilter === 'all' || f.status === statusFilter) &&
          (!search || f.expand?.paciente_id?.nome?.toLowerCase().includes(search.toLowerCase())) &&
          (!dateFrom || dtStr >= dateFrom) &&
          (!dateTo || dtStr <= dateTo)
        )
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'vencimento_asc':
            return (a.data_vencimento || '').localeCompare(b.data_vencimento || '')
          case 'vencimento_desc':
            return (b.data_vencimento || '').localeCompare(a.data_vencimento || '')
          case 'paciente_asc':
            return (a.expand?.paciente_id?.nome || '').localeCompare(
              b.expand?.paciente_id?.nome || '',
            )
          case 'valor_desc':
            return b.valor - a.valor
          case 'valor_asc':
            return a.valor - b.valor
          case 'status':
            return a.status.localeCompare(b.status)
          default:
            return 0
        }
      })
  }, [faturas, search, statusFilter, dateFrom, dateTo, sortBy])

  const handlePagamento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFatura) return
    const fd = new FormData(e.currentTarget)
    try {
      const dtStr = fd.get('data_pagamento') as string
      const dt = dtStr ? `${dtStr} 12:00:00.000Z` : new Date().toISOString()
      await createPagamento({
        fatura_id: selectedFatura.id,
        valor_pago: parseFloat(fd.get('valor_pago') as string),
        data_pagamento: dt,
        metodo: fd.get('metodo') as any,
        observacoes: fd.get('observacoes') as string,
      })
      await updateFatura(selectedFatura.id, { status: 'paga', data_pagamento: dt })
      toast.success('Pagamento registrado com sucesso')
      setSelectedFatura(null)
    } catch {
      toast.error('Erro ao registrar pagamento')
    }
  }

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingFatura) return
    const fd = new FormData(e.currentTarget)
    try {
      const dtStr = fd.get('data_vencimento') as string
      const dt = dtStr ? `${dtStr} 12:00:00.000Z` : editingFatura.data_vencimento
      await updateFatura(editingFatura.id, {
        data_vencimento: dt,
        observacoes: fd.get('observacoes') as string,
      })
      toast.success('Fatura atualizada com sucesso')
      setEditingFatura(null)
    } catch {
      toast.error('Erro ao atualizar fatura')
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
    <div className="space-y-4 bg-background p-6 rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="text-primary" /> Dashboard Financeiro
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="paga">Paga</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[190px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vencimento_asc">Vencimento (Próximos)</SelectItem>
            <SelectItem value="vencimento_desc">Vencimento (Distantes)</SelectItem>
            <SelectItem value="paciente_asc">Paciente (A-Z)</SelectItem>
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
            title="Vencimento a partir de"
            className="w-full md:w-[140px]"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="Vencimento até"
            className="w-full md:w-[140px]"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-4">
            Nenhuma fatura encontrada com esses filtros
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
              setDateFrom('')
              setDateTo('')
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{formatDt(f.data_vencimento)}</TableCell>
                    <TableCell className="font-medium">
                      {f.expand?.paciente_id?.nome || 'N/A'}
                    </TableCell>
                    <TableCell className="capitalize">{f.tipo_parcela}</TableCell>
                    <TableCell>{formatBRL(f.valor)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          f.status === 'paga'
                            ? 'default'
                            : f.status === 'vencida'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="capitalize"
                      >
                        {f.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{f.status === 'paga' ? formatDt(f.data_pagamento) : '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        onClick={() => setEditingFatura(f)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {f.status !== 'paga' && (
                        <Button size="sm" onClick={() => setSelectedFatura(f)}>
                          Receber
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 md:hidden">
            {filteredAndSorted.map((f) => (
              <Card key={f.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-base">{f.expand?.paciente_id?.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Vencimento: {formatDt(f.data_vencimento)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        f.status === 'paga'
                          ? 'default'
                          : f.status === 'vencida'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="capitalize"
                    >
                      {f.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <p className="font-bold text-lg">{formatBRL(f.valor)}</p>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" onClick={() => setEditingFatura(f)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {f.status !== 'paga' && (
                        <Button size="sm" onClick={() => setSelectedFatura(f)}>
                          Receber
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!selectedFatura} onOpenChange={(v) => !v && setSelectedFatura(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePagamento} className="space-y-4">
            <div className="p-3 bg-muted rounded-md text-sm mb-4">
              <p>
                <strong>Paciente:</strong> {selectedFatura?.expand?.paciente_id?.nome}
              </p>
              <p>
                <strong>Valor Devido:</strong> {formatBRL(selectedFatura?.valor || 0)}
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
              <Label>Valor Pago (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                name="valor_pago"
                defaultValue={selectedFatura?.valor}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Método de Pagamento *</Label>
              <Select name="metodo" defaultValue="transferencia" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferência/PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input name="observacoes" placeholder="Comprovante anexo..." />
            </div>
            <Button type="submit" className="w-full">
              Confirmar Pagamento
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingFatura} onOpenChange={(v) => !v && setEditingFatura(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fatura</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input
                type="date"
                name="data_vencimento"
                defaultValue={editingFatura?.data_vencimento?.slice(0, 10)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                name="observacoes"
                defaultValue={editingFatura?.observacoes}
                placeholder="Notas internas sobre a fatura..."
                className="resize-none"
              />
            </div>
            <Button type="submit" className="w-full">
              Salvar Alterações
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
