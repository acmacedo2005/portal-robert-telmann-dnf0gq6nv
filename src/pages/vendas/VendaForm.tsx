import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import pb from '@/lib/pocketbase/client'
import { addDays } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DatePicker } from '@/components/ui/date-picker'
import { getPacientes } from '@/services/pacientes'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trash2, Calculator } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'

const formSchema = z.object({
  paciente_id: z.string().min(1, 'Paciente é obrigatório'),
  vendedor_id: z.string().min(1, 'Vendedor é obrigatório'),
  percentual_comissao: z.number().min(0).max(100).default(10),
  tipo: z.enum(['cirurgia', 'tratamento', 'cirurgia_tratamento']),
  data_venda: z.date(),
  valor_total: z.number().min(0),
  desconto_cortesia: z.number().min(0).default(0),
  entrada_paga: z.number().min(0).default(0),
  observacoes: z.string().optional(),
})

export default function VendaForm({ isOpen, onClose, initialData, onSuccess }: any) {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const { toast } = useToast()

  const [parcelasState, setParcelasState] = useState<any[]>([])
  const [gerador, setGerador] = useState({
    qtd: 1,
    formaEntrada: 'pix',
    formaDemais: 'cartao_credito',
    intervalo: 30,
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valor_total: 0,
      desconto_cortesia: 0,
      entrada_paga: 0,
      percentual_comissao: 10,
      data_venda: new Date(),
    },
  })

  useEffect(() => {
    getPacientes().then(setPacientes)
    pb.collection('users')
      .getFullList({ filter: "papel='vendedor'" })
      .then(setVendedores)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isOpen && !initialData) {
      form.reset({
        data_venda: new Date(),
        valor_total: 0,
        desconto_cortesia: 0,
        entrada_paga: 0,
        percentual_comissao: 10,
        paciente_id: '',
        vendedor_id: '',
        tipo: 'tratamento',
        observacoes: '',
      })
      setParcelasState([])
    } else if (initialData) {
      form.reset({
        ...initialData,
        data_venda: new Date(initialData.data_venda),
        vendedor_id: initialData.vendedor_id || '',
      })
      setParcelasState([])
    }
  }, [initialData, isOpen, form])

  const valFinal = Math.max(
    0,
    (form.watch('valor_total') || 0) - (form.watch('desconto_cortesia') || 0),
  )
  const entrada = form.watch('entrada_paga') || 0
  const saldo = Math.max(0, valFinal - entrada)

  const gerarParcelas = () => {
    const newParcelas = []
    if (entrada > 0) {
      newParcelas.push({
        numero_parcela: 1,
        valor_parcela: entrada,
        data_vencimento: form.watch('data_venda'),
        forma_pagamento: gerador.formaEntrada,
        status: 'paga',
      })
    }
    if (saldo > 0 && gerador.qtd > 0) {
      const vParcela = saldo / gerador.qtd
      let dataAtual = new Date(form.watch('data_venda'))
      for (let i = 0; i < gerador.qtd; i++) {
        dataAtual = addDays(dataAtual, gerador.intervalo)
        newParcelas.push({
          numero_parcela: (entrada > 0 ? 1 : 0) + i + 1,
          valor_parcela: vParcela,
          data_vencimento: dataAtual,
          forma_pagamento: gerador.formaDemais,
          status: 'pendente',
        })
      }
    }
    setParcelasState(newParcelas)
    toast({ title: 'Parcelas geradas com sucesso!' })
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (parcelasState.length === 0 && valFinal > 0) {
        toast({
          title: 'Aviso',
          description: 'Gere as parcelas antes de salvar a venda.',
          variant: 'destructive',
        })
        return
      }

      const isAllPaid = parcelasState.length > 0 && parcelasState.every((p) => p.status === 'paga')
      const isAnyPaid = parcelasState.some((p) => p.status === 'paga')
      const statusVenda = isAllPaid ? 'paga' : isAnyPaid ? 'parcial' : 'pendente'

      const payload = {
        ...values,
        data_venda: values.data_venda.toISOString(),
        valor_final: valFinal,
        saldo_restante: saldo,
        status: statusVenda,
      }

      if (initialData) {
        await pb.collection('vendas').update(initialData.id, payload)
        toast({ title: 'Venda atualizada' })
      } else {
        const venda = await pb.collection('vendas').create(payload)

        for (const p of parcelasState) {
          await pb.collection('parcelas_venda').create({
            venda_id: venda.id,
            numero_parcela: p.numero_parcela,
            valor_parcela: p.valor_parcela,
            data_vencimento: new Date(p.data_vencimento).toISOString(),
            forma_pagamento: p.forma_pagamento,
            status: p.status,
            data_pagamento: p.status === 'paga' ? new Date().toISOString() : null,
          })
        }

        const valorComissao = (valFinal * values.percentual_comissao) / 100
        await pb.collection('comissoes_vendedor').create({
          vendedor_id: values.vendedor_id,
          venda_id: venda.id,
          percentual_comissao: values.percentual_comissao,
          valor_comissao: valorComissao,
          status: 'pendente',
          data_calculo: new Date().toISOString(),
        })

        toast({ title: 'Venda e parcelas criadas com sucesso' })
      }
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Falha ao salvar a venda.', variant: 'destructive' })
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-4 border-b bg-zinc-50 dark:bg-zinc-950">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold">
              {initialData ? 'Editar Venda' : 'Nova Venda (Wizard)'}
            </SheetTitle>
            <SheetDescription>
              Preencha os dados e gere as parcelas automaticamente.
            </SheetDescription>
          </SheetHeader>
        </div>
        <ScrollArea className="flex-1 p-6">
          <Form {...form}>
            <form id="venda-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paciente_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!initialData}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pacientes.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendedor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendedor *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!initialData}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendedores.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cirurgia">Cirurgia</SelectItem>
                          <SelectItem value="tratamento">Tratamento</SelectItem>
                          <SelectItem value="cirurgia_tratamento">Cirurgia + Trat.</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_venda"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-1">
                      <FormLabel>Data da Venda</FormLabel>
                      <DatePicker date={field.value} setDate={field.onChange} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="percentual_comissao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comissão (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg">
                <FormField
                  control={form.control}
                  name="valor_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Valor Total (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="font-bold"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          disabled={!!initialData}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="entrada_paga"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Entrada Paga (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="font-bold"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          disabled={!!initialData}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="col-span-2 flex justify-between font-bold text-primary border-t border-zinc-300 dark:border-zinc-700 pt-3">
                  <span>Valor Final: R$ {valFinal.toFixed(2)}</span>
                  <span className="text-destructive">Saldo a Pagar: R$ {saldo.toFixed(2)}</span>
                </div>
              </div>

              {!initialData && (
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Calculator className="w-4 h-4" /> Gerador de Parcelas (Wizard)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Número de Parcelas (Saldo)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={gerador.qtd}
                        onChange={(e) => setGerador({ ...gerador, qtd: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Intervalo (Dias)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={gerador.intervalo}
                        onChange={(e) =>
                          setGerador({ ...gerador, intervalo: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Forma Pgto. Entrada</Label>
                      <Select
                        value={gerador.formaEntrada}
                        onValueChange={(v) => setGerador({ ...gerador, formaEntrada: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cartao_debito">Débito</SelectItem>
                          <SelectItem value="cartao_credito">Crédito</SelectItem>
                          <SelectItem value="permuta">Permuta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Forma Pgto. Parcelas</Label>
                      <Select
                        value={gerador.formaDemais}
                        onValueChange={(v) => setGerador({ ...gerador, formaDemais: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                          <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full font-bold bg-zinc-200 dark:bg-zinc-800"
                    onClick={gerarParcelas}
                  >
                    Gerar Tabela de Parcelas
                  </Button>

                  {parcelasState.length > 0 && (
                    <div className="mt-4 border rounded overflow-hidden">
                      <Table>
                        <TableHeader className="bg-zinc-100 dark:bg-zinc-900">
                          <TableRow>
                            <TableHead className="text-xs py-2 h-8">Nº</TableHead>
                            <TableHead className="text-xs py-2 h-8">Valor</TableHead>
                            <TableHead className="text-xs py-2 h-8">Vencimento</TableHead>
                            <TableHead className="text-xs py-2 h-8">Forma</TableHead>
                            <TableHead className="text-xs py-2 h-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parcelasState.map((p, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="p-2 text-xs font-bold">
                                {p.numero_parcela}
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  type="number"
                                  className="h-7 text-xs font-bold w-24"
                                  value={p.valor_parcela}
                                  onChange={(e) => {
                                    const ns = [...parcelasState]
                                    ns[idx].valor_parcela = Number(e.target.value)
                                    setParcelasState(ns)
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-2 text-xs font-medium">
                                {format(new Date(p.data_vencimento), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="p-2 text-xs">{p.forma_pagamento}</TableCell>
                              <TableCell className="p-2 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    setParcelasState(parcelasState.filter((_, i) => i !== idx))
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </form>
          </Form>
        </ScrollArea>
        <div className="p-6 border-t bg-white dark:bg-zinc-900 mt-auto">
          <Button
            form="venda-form"
            type="submit"
            className="w-full font-bold h-12 text-base shadow-md"
          >
            {initialData ? 'Salvar Alterações' : 'Confirmar Venda e Salvar Parcelas'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
