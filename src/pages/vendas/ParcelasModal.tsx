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
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { getParcelasByVenda, updateParcela } from '@/services/parcelas_venda'
import { createContaPagar } from '@/services/contas_pagar'
import { updateVenda } from '@/services/vendas'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

export function ParcelasModal({ venda, isOpen, onClose }: any) {
  const [parcelas, setParcelas] = useState<any[]>([])
  const [pagandoId, setPagandoId] = useState<string | null>(null)
  const [taxa, setTaxa] = useState<number>(0)
  const { toast } = useToast()

  const loadParcelas = async () => {
    if (!venda) return
    try {
      const data = await getParcelasByVenda(venda.id)
      setParcelas(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (isOpen) loadParcelas()
  }, [isOpen, venda])

  const handlePagar = async (parcela: any) => {
    try {
      const isCard = parcela.forma_pagamento.includes('cartao')
      let valorTaxa = 0
      let valorLiquido = parcela.valor_parcela

      if (isCard && taxa > 0) {
        valorTaxa = (parcela.valor_parcela * taxa) / 100
        valorLiquido = parcela.valor_parcela - valorTaxa

        await createContaPagar({
          descricao: `Taxa Cartão - Parcela ${parcela.numero_parcela} (Venda ${venda.id})`,
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

      await updateParcela(parcela.id, {
        status: 'paga',
        data_pagamento: new Date().toISOString(),
        taxa_percentual: isCard ? taxa : 0,
        valor_taxa: valorTaxa,
        valor_liquido: valorLiquido,
      })

      toast({ title: 'Pagamento registrado com sucesso!' })

      const updatedList = await getParcelasByVenda(venda.id)
      setParcelas(updatedList)

      const allPaid = updatedList.every((p) => p.status === 'paga')
      if (allPaid && venda.status !== 'paga') {
        await updateVenda(venda.id, { status: 'paga' })
      } else if (
        !allPaid &&
        updatedList.some((p) => p.status === 'paga') &&
        venda.status === 'pendente'
      ) {
        await updateVenda(venda.id, { status: 'parcial' })
      }

      setPagandoId(null)
      setTaxa(0)
    } catch (e) {
      toast({ title: 'Erro ao registrar', variant: 'destructive' })
    }
  }

  const printReceipt = (parcela: any) => {
    const pacienteNome = venda?.expand?.paciente_id?.nome || 'Paciente'

    const future = parcelas.filter(
      (p) => p.status === 'pendente' && new Date(p.data_vencimento) > new Date(),
    )
    const futureHtml =
      future.length > 0
        ? `
      <h3>Próximas Parcelas</h3>
      <ul>
        ${future.map((p) => `<li>Parcela ${p.numero_parcela}: R$ ${p.valor_parcela.toFixed(2)} - Vencimento: ${format(new Date(p.data_vencimento), 'dd/MM/yyyy')}</li>`).join('')}
      </ul>
    `
        : '<p>Não há parcelas futuras.</p>'

    const html = `
    <html><head><title>Recibo de Pagamento</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; }
      h2 { border-bottom: 2px solid #000; padding-bottom: 10px; }
      .info { margin-bottom: 20px; line-height: 1.6; }
      .footer { margin-top: 50px; text-align: center; }
      .line { border-top: 1px solid #000; width: 300px; margin: 50px auto 10px; }
    </style>
    </head><body>
      <h2>Recibo de Pagamento</h2>
      <div class="info">
        <p><strong>Paciente:</strong> ${pacienteNome}</p>
        <p><strong>Referente a:</strong> Parcela ${parcela.numero_parcela} (Venda #${venda.id})</p>
        <p><strong>Forma de Pagamento:</strong> ${parcela.forma_pagamento.toUpperCase()}</p>
        <p><strong>Valor Pago:</strong> R$ ${parcela.valor_parcela.toFixed(2)}</p>
        <p><strong>Data do Pagamento:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      </div>
      ${futureHtml}
      <div class="footer">
        <div class="line"></div>
        <p>Assinatura do Responsável</p>
      </div>
    </body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.print()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Parcelas da Venda</DialogTitle>
          <DialogDescription>
            Paciente:{' '}
            <strong className="text-black dark:text-white">
              {venda?.expand?.paciente_id?.nome}
            </strong>
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto max-h-[60vh] border rounded-lg">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-bold">{p.numero_parcela}</TableCell>
                  <TableCell>{format(new Date(p.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="uppercase text-xs font-semibold text-zinc-500">
                    {p.forma_pagamento}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(p.valor_parcela)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        p.status === 'paga'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {p.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === 'pendente' ? (
                      pagandoId === p.id ? (
                        <div className="flex flex-col gap-2 items-end">
                          {p.forma_pagamento.includes('cartao') && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Taxa %:</Label>
                              <Input
                                type="number"
                                className="w-20 h-8 text-xs"
                                value={taxa}
                                onChange={(e) => setTaxa(Number(e.target.value))}
                              />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => setPagandoId(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handlePagar(p)}
                            >
                              Confirmar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => {
                            setPagandoId(p.id)
                            setTaxa(0)
                          }}
                        >
                          Registrar
                        </Button>
                      )
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs font-bold text-blue-600"
                        onClick={() => printReceipt(p)}
                      >
                        Recibo
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
