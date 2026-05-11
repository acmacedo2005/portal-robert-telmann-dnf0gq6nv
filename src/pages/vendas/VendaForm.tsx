import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DatePicker } from '@/components/ui/date-picker'
import { getPacientes } from '@/services/pacientes'
import { createVenda, updateVenda } from '@/services/vendas'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
  paciente_id: z.string().min(1, 'Paciente é obrigatório'),
  tipo: z.enum(['cirurgia', 'tratamento', 'cirurgia_tratamento'], {
    required_error: 'Tipo é obrigatório',
  }),
  data_venda: z.date({ required_error: 'Data da venda é obrigatória' }),
  data_cirurgia: z.date().optional(),
  data_inicio_tratamento: z.date().optional(),
  valor_total: z.number().min(0),
  desconto_cortesia: z.number().min(0).default(0),
  entrada_paga: z.number().min(0).default(0),
  parcelas: z.number().min(1).default(1),
  sessoes_meso: z.number().min(0).default(0),
  sessoes_prp: z.number().min(0).default(0),
  sessoes_botox: z.number().min(0).default(0),
  observacoes: z.string().optional(),
})

export default function VendaForm({ isOpen, onClose, initialData, onSuccess }: any) {
  const [pacientes, setPacientes] = useState<any[]>([])
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valor_total: 0,
      desconto_cortesia: 0,
      entrada_paga: 0,
      parcelas: 1,
      sessoes_meso: 0,
      sessoes_prp: 0,
      sessoes_botox: 0,
      data_venda: new Date(),
      ...initialData,
    },
  })

  useEffect(() => {
    getPacientes().then(setPacientes)
  }, [])

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        data_venda: new Date(initialData.data_venda),
        data_cirurgia: initialData.data_cirurgia ? new Date(initialData.data_cirurgia) : undefined,
        data_inicio_tratamento: initialData.data_inicio_tratamento
          ? new Date(initialData.data_inicio_tratamento)
          : undefined,
      })
    } else {
      form.reset({
        data_venda: new Date(),
        valor_total: 0,
        desconto_cortesia: 0,
        entrada_paga: 0,
        parcelas: 1,
      })
    }
  }, [initialData, isOpen, form])

  const tipo = form.watch('tipo')
  const valTotal = form.watch('valor_total') || 0
  const desc = form.watch('desconto_cortesia') || 0
  const entrada = form.watch('entrada_paga') || 0

  const valFinal = Math.max(0, valTotal - desc)
  const saldo = Math.max(0, valFinal - entrada)

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const status = saldo <= 0 ? 'paga' : entrada > 0 ? 'parcial' : 'pendente'
      const payload = {
        ...values,
        data_venda: values.data_venda.toISOString(),
        data_cirurgia: values.data_cirurgia ? values.data_cirurgia.toISOString() : null,
        data_inicio_tratamento: values.data_inicio_tratamento
          ? values.data_inicio_tratamento.toISOString()
          : null,
        valor_final: valFinal,
        saldo_restante: saldo,
        status,
      }
      if (initialData) await updateVenda(initialData.id, payload)
      else await createVenda(payload)

      toast({ title: initialData ? 'Venda atualizada' : 'Venda criada com sucesso' })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md w-full overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-2 border-b">
          <SheetHeader>
            <SheetTitle>{initialData ? 'Editar Venda' : 'Nova Venda'}</SheetTitle>
            <SheetDescription>Preencha os dados da venda abaixo.</SheetDescription>
          </SheetHeader>
        </div>
        <ScrollArea className="flex-1 p-6">
          <Form {...form}>
            <form id="venda-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-1">
              <FormField
                control={form.control}
                name="paciente_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paciente</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cirurgia">Cirurgia</SelectItem>
                          <SelectItem value="tratamento">Tratamento</SelectItem>
                          <SelectItem value="cirurgia_tratamento">Cirurgia + Tratamento</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_venda"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                      <FormLabel>Data da Venda</FormLabel>
                      <DatePicker date={field.value} setDate={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(tipo === 'cirurgia' || tipo === 'cirurgia_tratamento') && (
                  <FormField
                    control={form.control}
                    name="data_cirurgia"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Prevista (Cirurgia)</FormLabel>
                        <DatePicker date={field.value} setDate={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {(tipo === 'tratamento' || tipo === 'cirurgia_tratamento') && (
                  <FormField
                    control={form.control}
                    name="data_inicio_tratamento"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Início do Tratamento</FormLabel>
                        <DatePicker date={field.value} setDate={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-md">
                <FormField
                  control={form.control}
                  name="valor_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="desconto_cortesia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-2 flex justify-between font-medium pt-2 border-t text-primary">
                  <span>Valor Final</span>
                  <span>R$ {valFinal.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entrada_paga"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entrada Paga</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parcelas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parcelas (Saldo)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-2 flex justify-between font-medium text-destructive">
                  <span>Saldo Restante</span>
                  <span>R$ {saldo.toFixed(2)}</span>
                </div>
              </div>

              {(tipo === 'tratamento' || tipo === 'cirurgia_tratamento') && (
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    control={form.control}
                    name="sessoes_meso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sessões Meso</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="sessoes_prp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sessões PRP</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="sessoes_botox"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sessões Botox</FormLabel>
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
              )}

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inclusões / Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        <div className="p-6 border-t mt-auto">
          <Button form="venda-form" type="submit" className="w-full">
            Salvar Venda
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
