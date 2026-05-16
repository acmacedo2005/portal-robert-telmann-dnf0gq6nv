import { useState, useEffect, useMemo } from 'react'
import { getFaturas, updateFatura, type Fatura } from '@/services/faturas'
import { createPagamento, getPagamentos } from '@/services/pagamentos'
import { createContaPagar } from '@/services/contas_pagar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Search,
  Inbox,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar as CalendarIcon,
  List,
} from 'lucide-react'
import { CurrencyInput } from '@/components/ui/currency-input'

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0)

const formatDt = (d?: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '-')

const printReceipt = (fatura: Fatura, pagamento: any) => {
  const win = window.open('', '_blank')
  if (!win) return
  const nextDueDateStr =
    fatura.status === 'parcial' && fatura.data_vencimento
      ? `<p><strong>Próximo Vencimento:</strong> ${formatDt(fatura.data_vencimento)}</p>`
      : ''
  win.document.write(`
    <html>
      <head><title>Recibo de Pagamento</title></head>
      <body style="font-family: sans-serif; padding: 40px; max-width: 800px; margin: auto; color: #333;">
        <h2 style="text-align: center; color: #000;">Recibo de Pagamento</h2>
        <hr style="border: 1px solid #ccc;" />
        <br/>
        <p><strong>Paciente:</strong> ${fatura.expand?.paciente_id?.nome || '-'}</p>
        <p><strong>Valor Recebido:</strong> ${formatBRL(pagamento.valor_pago)}</p>
        <p><strong>Data do Pagamento:</strong> ${formatDt(pagamento.data_pagamento)}</p>
        <p><strong>Forma de Pagamento:</strong> <span style="text-transform: capitalize;">${pagamento.metodo?.replace('_', ' ') || '-'}</span></p>
        ${nextDueDateStr}
        <p><strong>Observações:</strong> ${pagamento.observacoes || 'Nenhuma'}</p>
        <br/><br/><br/><br/>
        <p style="text-align: center;">_________________________________________</p>
        <p style="text-align: center; font-size: 14px;">Assinatura do Responsável</p>
      </body>
    </html>
  `)
  win.document.close()
  setTimeout(() => win.print(), 500)
}

export function FaturasTab() {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null)
  const [parcelasDialogFatura, setParcelasDialogFatura] = useState<Fatura | null>(null)

  const [valorRecebido, setValorRecebido] = useState<number>(0)
  const [metodo, setMetodo] = useState('pix')

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

  const todayStr = new Date().toISOString().slice(0, 10)
  const next7DaysDate = new Date()
  next7DaysDate.setDate(next7DaysDate.getDate() + 7)
  const next7DaysStr = next7DaysDate.toISOString().slice(0, 10)

  const summary = useMemo(() => {
    let totalReceber = 0
    let vencidas = 0
    let proximas7 = 0

    faturas.forEach((f) => {
      if (f.status !== 'paga') {
        const valor = f.saldo_restante ?? f.valor
        totalReceber += valor

        const dt = f.data_vencimento?.slice(0, 10) || ''
        if (dt < todayStr) {
          vencidas += valor
        } else if (dt >= todayStr && dt <= next7DaysStr) {
          proximas7 += valor
        }
      }
    })
    return { totalReceber, vencidas, proximas7 }
  }, [faturas, todayStr, next7DaysStr])

  const filtered = useMemo(() => {
    return faturas.filter((f) => {
      const dtStr = f.data_vencimento?.slice(0, 10) || ''
      return (
        (statusFilter === 'all' || f.status === statusFilter) &&
        (!search || f.expand?.paciente_id?.nome?.toLowerCase().includes(search.toLowerCase())) &&
        (!dateFrom || dtStr >= dateFrom) &&
        (!dateTo || dtStr <= dateTo)
      )
    })
  }, [faturas, search, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    if (selectedFatura) {
      setValorRecebido(selectedFatura.saldo_restante ?? selectedFatura.valor)
      setMetodo('pix')
    }
  }, [selectedFatura])

  const handlePagamento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFatura) return
    const fd = new FormData(e.currentTarget)

    const dataPagamentoStr = fd.get('data_pagamento') as string
    const dataPagamento = dataPagamentoStr
      ? `${dataPagamentoStr} 12:00:00.000Z`
      : new Date().toISOString()
    const obs = fd.get('observacoes') as string

    const isCard = metodo === 'cartao_credito' || metodo === 'cartao_debito'
    const taxaPerc = isCard ? parseFloat((fd.get('taxa_percentual') as string) || '0') : 0

    const saldoAtual = selectedFatura.saldo_restante ?? selectedFatura.valor
    if (valorRecebido <= 0) {
      return toast.error('O valor recebido deve ser maior que zero.')
    }
    if (valorRecebido > saldoAtual) {
      return toast.error(`O valor não pode ser maior que o saldo de ${formatBRL(saldoAtual)}.`)
    }
    const isPartial = valorRecebido < saldoAtual

    const parcelasRest = isPartial ? parseInt((fd.get('parcelas_restantes') as string) || '0') : 0
    const dataProx = isPartial
      ? `${fd.get('data_proximo_vencimento')} 12:00:00.000Z`
      : selectedFatura.data_vencimento

    try {
      const pag = await createPagamento({
        fatura_id: selectedFatura.id,
        valor_pago: valorRecebido,
        data_pagamento: dataPagamento,
        metodo: metodo as any,
        observacoes: obs,
      })

      const newValorPago = (selectedFatura.valor_pago || 0) + valorRecebido
      const newSaldo = Math.max(0, saldoAtual - valorRecebido)
      const newStatus = newSaldo <= 0 ? 'paga' : 'parcial'

      await updateFatura(selectedFatura.id, {
        status: newStatus,
        valor_pago: newValorPago,
        saldo_restante: newSaldo,
        parcelas_restantes: parcelasRest,
        data_vencimento: dataProx,
        ...(newStatus === 'paga' ? { data_pagamento: dataPagamento } : {}),
      })

      if (isCard && taxaPerc > 0) {
        const taxaVal = valorRecebido * (taxaPerc / 100)
        await createContaPagar({
          descricao: `Taxa Cartão - Fatura ${selectedFatura.id}`,
          fornecedor: 'Operadora de Cartão',
          valor: taxaVal,
          status: 'paga',
          categoria: 'taxas_cartao',
          data_vencimento: dataPagamento,
          data_pagamento: dataPagamento,
          valor_pago: taxaVal,
          metodo_pagamento: 'transferencia',
        })
      }

      toast.success('Pagamento registrado com sucesso', {
        action: { label: 'Imprimir Recibo', onClick: () => printReceipt(selectedFatura, pag) },
      })
      setSelectedFatura(null)
    } catch {
      toast.error('Erro ao registrar pagamento')
    }
  }

  const handleEmitirRecibo = async (fatura: Fatura) => {
    try {
      const pagamentos = await getPagamentos()
      const pags = pagamentos
        .filter((p) => p.fatura_id === fatura.id)
        .sort((a, b) => b.created.localeCompare(a.created))
      const pag = pags[0] || {
        valor_pago: fatura.valor_pago || fatura.valor,
        data_pagamento: fatura.data_pagamento || new Date().toISOString(),
        metodo: 'Indefinido',
        observacoes: '',
      }
      printReceipt(fatura, pag)
    } catch (e) {
      toast.error('Erro ao emitir recibo')
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

  const saldoAtualModal = selectedFatura?.saldo_restante ?? selectedFatura?.valor ?? 0
  const isPartialModal = valorRecebido < saldoAtualModal
  const isCardModal = metodo === 'cartao_credito' || metodo === 'cartao_debito'

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pendente</Badge>
      case 'vencida':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Vencida</Badge>
      case 'paga':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Paga</Badge>
      case 'parcial':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Parcial</Badge>
      default:
        return (
          <Badge variant="secondary" className="capitalize">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Contas a Receber</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(summary.totalReceber)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatBRL(summary.vencidas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> Próximas 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(summary.proximas7)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
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
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="paga">Paga</SelectItem>
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
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">Nenhuma fatura</p>
          <p className="text-sm text-muted-foreground mb-4">
            Ajuste os filtros para encontrar faturas.
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
          <div className="hidden md:block rounded-md border bg-white dark:bg-zinc-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Entrada Paga</TableHead>
                  <TableHead>Saldo Restante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => {
                  const isVencida =
                    f.status !== 'paga' && (f.data_vencimento?.slice(0, 10) || '') < todayStr
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        {f.expand?.paciente_id?.nome || 'N/A'}
                      </TableCell>
                      <TableCell>{formatBRL(f.valor)}</TableCell>
                      <TableCell>{formatBRL(f.valor_pago || 0)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatBRL(f.saldo_restante ?? f.valor)}
                      </TableCell>
                      <TableCell>{getStatusBadge(f.status)}</TableCell>
                      <TableCell className={isVencida ? 'text-red-500 font-medium' : ''}>
                        {formatDt(f.data_vencimento)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Ver Parcelas"
                          onClick={() => setParcelasDialogFatura(f)}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Emitir Recibo"
                          onClick={() => handleEmitirRecibo(f)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {f.status !== 'paga' && (
                          <Button size="sm" onClick={() => setSelectedFatura(f)}>
                            Registrar Pagamento
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
            {filtered.map((f) => {
              const isVencida =
                f.status !== 'paga' && (f.data_vencimento?.slice(0, 10) || '') < todayStr
              return (
                <Card key={f.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-base">{f.expand?.paciente_id?.nome}</p>
                        <p
                          className={
                            isVencida
                              ? 'text-sm text-red-500 font-medium'
                              : 'text-sm text-muted-foreground'
                          }
                        >
                          Vencimento: {formatDt(f.data_vencimento)}
                        </p>
                      </div>
                      {getStatusBadge(f.status)}
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      Saldo:{' '}
                      <span className="font-bold text-primary">
                        {formatBRL(f.saldo_restante ?? f.valor)}
                      </span>{' '}
                      (de {formatBRL(f.valor)})
                    </div>
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setParcelasDialogFatura(f)}
                        title="Ver Parcelas"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleEmitirRecibo(f)}
                        title="Emitir Recibo"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      {f.status !== 'paga' && (
                        <Button size="sm" onClick={() => setSelectedFatura(f)}>
                          Registrar Pagamento
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={!!selectedFatura} onOpenChange={(v) => !v && setSelectedFatura(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePagamento} className="space-y-4">
            <div className="p-3 bg-muted rounded-md text-sm mb-4">
              <p>
                <strong>Paciente:</strong> {selectedFatura?.expand?.paciente_id?.nome}
              </p>
              <p>
                <strong>Saldo Devido:</strong> {formatBRL(saldoAtualModal)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Pago *</Label>
                <CurrencyInput value={valorRecebido} onValueChange={setValorRecebido} />
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
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento *</Label>
              <Select value={metodo} onValueChange={setMetodo} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="permuta">Permuta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isCardModal && (
              <div className="space-y-2 p-3 bg-primary/5 rounded-md border border-primary/10 animate-in fade-in zoom-in duration-200">
                <Label>Taxa % *</Label>
                <Input
                  type="number"
                  step="0.01"
                  name="taxa_percentual"
                  placeholder="Ex: 2.5"
                  required
                  defaultValue={0}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O sistema irá deduzir essa taxa e criar uma despesa automaticamente em Contas a
                  Pagar.
                </p>
              </div>
            )}

            {isPartialModal && (
              <div className="space-y-4 p-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 rounded-md animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-500">
                  Pagamento Parcial Identificado
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantas parcelas faltam? *</Label>
                    <Input
                      type="number"
                      name="parcelas_restantes"
                      required
                      min={1}
                      defaultValue={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Qual a data do próximo vencimento? *</Label>
                    <Input type="date" name="data_proximo_vencimento" required />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input name="observacoes" placeholder="Comprovante anexo, notas..." />
            </div>
            <Button type="submit" className="w-full">
              Confirmar Pagamento
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!parcelasDialogFatura}
        onOpenChange={(v) => !v && setParcelasDialogFatura(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Fatura</DialogTitle>
            <DialogDescription>Informações de parcelas e saldo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              <strong>Paciente:</strong> {parcelasDialogFatura?.expand?.paciente_id?.nome}
            </p>
            <p>
              <strong>Valor Total:</strong> {formatBRL(parcelasDialogFatura?.valor || 0)}
            </p>
            <p>
              <strong>Valor Pago:</strong> {formatBRL(parcelasDialogFatura?.valor_pago || 0)}
            </p>
            <p>
              <strong>Saldo Restante:</strong>{' '}
              {formatBRL(parcelasDialogFatura?.saldo_restante ?? parcelasDialogFatura?.valor ?? 0)}
            </p>
            <p>
              <strong>Parcelas Restantes:</strong> {parcelasDialogFatura?.parcelas_restantes || '-'}
            </p>
            <p>
              <strong>Status:</strong>{' '}
              <span className="capitalize">{parcelasDialogFatura?.status}</span>
            </p>
            <Button className="w-full" onClick={() => setParcelasDialogFatura(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
