import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Printer, CheckCircle, CreditCard, Loader2 } from 'lucide-react'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

export function ParcelasModal({ venda, isOpen, onClose }: any) {
  const [parcelas, setParcelas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagandoId, setPagandoId] = useState<string | null>(null)

  // Payment Form State
  const [taxa, setTaxa] = useState<number>(0)
  const [valorPago, setValorPago] = useState<number>(0)
  const [dataPgto, setDataPgto] = useState<string>(new Date().toISOString().split('T')[0])
  const [formaPgto, setFormaPgto] = useState<string>('')

  const { toast } = useToast()

  const loadParcelas = async () => {
    if (!venda) return
    try {
      setLoading(true)
      const data = await pb.collection('parcelas_venda').getFullList({
        filter: `venda_id='${venda.id}'`,
        sort: 'numero_parcela',
      })
      setParcelas(data)
    } catch (e) {
      toast({ title: 'Erro ao carregar parcelas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) loadParcelas()
  }, [isOpen, venda])

  const startPayment = (p: any) => {
    setPagandoId(p.id)
    setValorPago(p.valor_parcela)
    setFormaPgto(p.forma_pagamento)
    setTaxa(p.taxa_percentual || 0)
    setDataPgto(new Date().toISOString().split('T')[0])
  }

  const handlePagar = async (parcela: any) => {
    try {
      const isCard = formaPgto.includes('cartao')
      let valorTaxa = 0
      let valorLiquido = valorPago

      if (isCard && taxa > 0) {
        valorTaxa = (valorPago * taxa) / 100
        valorLiquido = valorPago - valorTaxa

        // Create expense for card fee
        await pb.collection('contas_pagar').create({
          descricao: `Taxa Cartão - Parcela ${parcela.numero_parcela} (Venda #${venda.id.substring(0, 6)})`,
          fornecedor: 'Operadora de Cartão',
          valor: valorTaxa,
          status: 'paga',
          categoria: 'taxas_cartao',
          data_vencimento: new Date().toISOString(),
          data_pagamento: new Date().toISOString(),
          valor_pago: valorTaxa,
          metodo_pagamento: 'transferencia',
        })
      }

      await pb.collection('parcelas_venda').update(parcela.id, {
        status: 'paga',
        data_pagamento: new Date(dataPgto + 'T12:00:00.000Z').toISOString(),
        forma_pagamento: formaPgto,
        valor_parcela: valorPago, // Update in case they paid a different amount
        taxa_percentual: isCard ? taxa : 0,
        valor_taxa: valorTaxa,
        valor_liquido: valorLiquido,
      })

      toast({ title: 'Pagamento registrado com sucesso!' })

      const updatedList = await pb.collection('parcelas_venda').getFullList({
        filter: `venda_id='${venda.id}'`,
        sort: 'numero_parcela',
      })
      setParcelas(updatedList)

      const allPaid = updatedList.every((p) => p.status === 'paga')
      const anyPaid = updatedList.some((p) => p.status === 'paga')

      let novoStatus = venda.status
      if (allPaid && venda.status !== 'paga') novoStatus = 'paga'
      else if (!allPaid && anyPaid && venda.status === 'pendente') novoStatus = 'parcial'

      if (novoStatus !== venda.status) {
        await pb.collection('vendas').update(venda.id, { status: novoStatus })
      }

      setPagandoId(null)
    } catch (e) {
      toast({ title: 'Erro ao registrar pagamento', variant: 'destructive' })
    }
  }

  const printReceipt = (parcela: any) => {
    const pacienteNome = venda?.expand?.paciente_id?.nome || 'Paciente'
    const future = parcelas.filter((p) => p.status === 'pendente' && p.id !== parcela.id)

    const futureHtml =
      future.length > 0
        ? `
      <h3 style="margin-top:30px; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Próximas Parcelas (A Vencer)</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
        <tr style="text-align: left; background: #f9f9f9;"><th style="padding: 5px;">Nº</th><th style="padding: 5px;">Valor</th><th style="padding: 5px;">Vencimento</th></tr>
        ${future.map((p) => `<tr><td style="padding: 5px; border-bottom: 1px solid #eee;">${p.numero_parcela}</td><td style="padding: 5px; border-bottom: 1px solid #eee;">R$ ${p.valor_parcela.toFixed(2)}</td><td style="padding: 5px; border-bottom: 1px solid #eee;">${p.data_vencimento.slice(0, 10).split('-').reverse().join('/')}</td></tr>`).join('')}
      </table>
    `
        : '<p style="font-size: 12px; color: #666; margin-top: 20px;">Não há parcelas pendentes.</p>'

    const html = `
    <html><head><title>Recibo - ${pacienteNome}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; max-width: 600px; margin: auto; color: #333; }
      h2 { border-bottom: 2px solid #000; padding-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; font-size: 18px; margin-bottom: 30px;}
      .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dotted #ccc; padding-bottom: 5px; }
      .info-label { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #555; }
      .info-value { font-size: 14px; }
      .footer { margin-top: 60px; text-align: center; }
      .line { border-top: 1px solid #000; width: 250px; margin: 0 auto 10px; }
      .stamp { display: inline-block; border: 2px solid #22c55e; color: #22c55e; padding: 10px 20px; font-weight: bold; border-radius: 5px; transform: rotate(-5deg); margin-top: 20px; font-size: 20px;}
    </style>
    </head><body onload="window.print()">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin:0;">CLÍNICA TELMANN</h1>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Transplante Capilar & Estética</p>
      </div>
      <h2>Recibo de Pagamento</h2>
      
      <div class="info-row"><span class="info-label">Paciente</span><span class="info-value">${pacienteNome}</span></div>
      <div class="info-row"><span class="info-label">Referente a</span><span class="info-value">Parcela ${parcela.numero_parcela} (Venda #${venda.id.substring(0, 8)})</span></div>
      <div class="info-row"><span class="info-label">Data do Pagamento</span><span class="info-value">${format(new Date(parcela.data_pagamento || new Date()), 'dd/MM/yyyy')}</span></div>
      <div class="info-row"><span class="info-label">Forma de Pagamento</span><span class="info-value">${parcela.forma_pagamento.replace('_', ' ').toUpperCase()}</span></div>
      <div class="info-row" style="border: none; margin-top: 20px;">
        <span class="info-label" style="font-size: 16px;">Valor Pago</span>
        <span class="info-value" style="font-size: 20px; font-weight: bold;">R$ ${parcela.valor_parcela.toFixed(2)}</span>
      </div>

      <div style="text-align: center;"><div class="stamp">PAGO</div></div>

      ${futureHtml}
      
      <div class="footer">
        <div class="line"></div>
        <p style="font-size: 12px; color: #666;">Assinatura do Responsável</p>
      </div>
    </body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white dark:bg-zinc-950 p-0 overflow-hidden">
        <div className="p-6 border-b bg-zinc-50 dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Parcelas da Venda
            </DialogTitle>
            <DialogDescription className="text-md">
              Paciente:{' '}
              <strong className="text-zinc-900 dark:text-white">
                {venda?.expand?.paciente_id?.nome}
              </strong>{' '}
              | Total:{' '}
              <strong className="text-zinc-900 dark:text-white">
                {formatCurrency(venda?.valor_final)}
              </strong>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-auto max-h-[65vh] p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-zinc-100 dark:bg-zinc-900">
                <TableRow>
                  <TableHead className="w-12 text-center">Nº</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right w-[200px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.map((p) => (
                  <TableRow
                    key={p.id}
                    className={p.status === 'paga' ? 'bg-green-50/30 dark:bg-green-900/10' : ''}
                  >
                    <TableCell className="text-center font-bold text-zinc-600">
                      {p.numero_parcela}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {p.data_vencimento.slice(0, 10).split('-').reverse().join('/')}
                    </TableCell>

                    {/* EDIT MODE vs VIEW MODE */}
                    {pagandoId === p.id ? (
                      <TableCell colSpan={4} className="p-0 border-l-2 border-primary">
                        <div className="bg-white dark:bg-zinc-900 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end shadow-inner">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Data Pgto</Label>
                            <Input
                              type="date"
                              value={dataPgto}
                              onChange={(e) => setDataPgto(e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Forma</Label>
                            <Select value={formaPgto} onValueChange={setFormaPgto}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pix">PIX</SelectItem>
                                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                                <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Valor (R$)</Label>
                            <Input
                              type="number"
                              value={valorPago}
                              onChange={(e) => setValorPago(Number(e.target.value))}
                              className="h-9 font-bold text-primary"
                            />
                          </div>
                          {formaPgto.includes('cartao') ? (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-orange-600">Taxa Cartão %</Label>
                              <Input
                                type="number"
                                value={taxa}
                                onChange={(e) => setTaxa(Number(e.target.value))}
                                className="h-9 border-orange-200"
                              />
                            </div>
                          ) : (
                            <div />
                          )}

                          <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                            <Button size="sm" variant="ghost" onClick={() => setPagandoId(null)}>
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handlePagar(p)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Confirmar Pagamento
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="uppercase text-[10px] font-bold text-zinc-500 tracking-wider">
                          {p.forma_pagamento.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(p.valor_parcela)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              p.status === 'paga'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }
                          >
                            {p.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === 'pendente' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 font-semibold shadow-sm"
                              onClick={() => startPayment(p)}
                            >
                              Registrar Pgto
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200"
                              onClick={() => printReceipt(p)}
                            >
                              <Printer className="w-4 h-4 mr-2" /> Recibo
                            </Button>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
