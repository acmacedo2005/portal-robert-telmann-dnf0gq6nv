import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import pb from '@/lib/pocketbase/client'
import { addDays, subDays } from 'date-fns'
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
import { UserPlus } from 'lucide-react'

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

  const [isCreatingPatient, setIsCreatingPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ nome: '', telefone: '', email: '' })

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
      setIsCreatingPatient(false)
    } else {
      form.reset({
        data_venda: new Date(),
        valor_total: 0,
        desconto_cortesia: 0,
        entrada_paga: 0,
        parcelas: 1,
        paciente_id: '',
      })
      setIsCreatingPatient(false)
      setNewPatient({ nome: '', telefone: '', email: '' })
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
      let pId = values.paciente_id
      if (isCreatingPatient || pId === 'novo') {
        if (!newPatient.nome) {
          toast({
            title: 'Erro',
            description: 'O nome do paciente é obrigatório.',
            variant: 'destructive',
          })
          return
        }
        const p = await pb.collection('pacientes').create(newPatient)
        pId = p.id
      }

      const status = saldo <= 0 ? 'paga' : entrada > 0 ? 'parcial' : 'pendente'
      const payload = {
        ...values,
        paciente_id: pId,
        data_venda: values.data_venda.toISOString(),
        data_cirurgia: values.data_cirurgia ? values.data_cirurgia.toISOString() : null,
        data_inicio_tratamento: values.data_inicio_tratamento
          ? values.data_inicio_tratamento.toISOString()
          : null,
        valor_final: valFinal,
        saldo_restante: saldo,
        status,
      }

      if (initialData) {
        await updateVenda(initialData.id, payload)
        toast({ title: 'Venda atualizada com sucesso' })
      } else {
        const venda = await createVenda(payload)

        // Automations
        const tipoVenda = values.tipo.includes('cirurgia') ? 'cirurgia' : 'tratamento'

        // Invoices
        if (entrada > 0) {
          await pb
            .collection('faturas')
            .create({
              paciente_id: pId,
              venda_id: venda.id,
              valor: entrada,
              data_vencimento: values.data_venda.toISOString(),
              status: 'paga',
              tipo_parcela: 'entrada',
              tipo: tipoVenda,
            })
            .catch(console.error)
        }

        if (saldo > 0) {
          const pNum = values.parcelas || 1
          const vParcela = saldo / pNum
          for (let i = 0; i < pNum; i++) {
            await pb
              .collection('faturas')
              .create({
                paciente_id: pId,
                venda_id: venda.id,
                valor: vParcela,
                data_vencimento: addDays(values.data_venda, 30 * (i + 1)).toISOString(),
                status: 'pendente',
                tipo_parcela: 'parcelada',
                numero_parcela: i + 1,
                tipo: tipoVenda,
              })
              .catch(console.error)
          }
        }

        // Treatment Balances
        const tratamentos = [
          { key: 'sessoes_meso', tipo: 'meso' },
          { key: 'sessoes_prp', tipo: 'prp' },
          { key: 'sessoes_botox', tipo: 'botox' },
        ] as const

        for (const t of tratamentos) {
          if (values[t.key] > 0) {
            await pb
              .collection('saldo_tratamentos')
              .create({
                venda_id: venda.id,
                paciente_id: pId,
                tipo_tratamento: t.tipo,
                sessoes_total: values[t.key],
                sessoes_restantes: values[t.key],
                status: 'ativo',
              })
              .catch(console.error)
          }
        }

        // Schedules
        const profs = await pb
          .collection('users')
          .getFullList({ filter: 'papel="medico" || papel="enfermagem"' })
          .catch(() => [])
        const defaultProfId = profs.length > 0 ? profs[0].id : pb.authStore.record?.id

        if (values.tipo.includes('cirurgia') && values.data_cirurgia) {
          await pb
            .collection('agendamentos')
            .create({
              paciente_id: pId,
              tipo: 'avaliacao',
              data_agendamento: subDays(values.data_cirurgia, 7).toISOString(),
              profissional_id: defaultProfId,
              status: 'agendado',
              observacoes: 'Avaliação Pré-cirúrgica gerada automaticamente.',
            })
            .catch(console.error)

          const retornos = [10, 30, 90, 180, 365]
          for (const d of retornos) {
            await pb
              .collection('agendamentos')
              .create({
                paciente_id: pId,
                tipo: 'retorno',
                data_agendamento: addDays(values.data_cirurgia, d).toISOString(),
                profissional_id: defaultProfId,
                status: 'agendado',
                observacoes: `Retorno pós-cirúrgico de ${d} dias.`,
              })
              .catch(console.error)
          }
        }

        if (values.tipo.includes('tratamento') && values.data_inicio_tratamento) {
          const totalSessoes =
            (values.sessoes_meso || 0) + (values.sessoes_prp || 0) + (values.sessoes_botox || 0)
          for (let i = 0; i < totalSessoes; i++) {
            await pb
              .collection('agendamentos')
              .create({
                paciente_id: pId,
                tipo: 'aplicacao',
                data_agendamento: addDays(values.data_inicio_tratamento, i * 7).toISOString(),
                profissional_id: defaultProfId,
                status: 'agendado',
                observacoes: `Sessão ${i + 1} gerada automaticamente.`,
              })
              .catch(console.error)
          }
        }

        toast({ title: 'Registro criado com sucesso' })
      }
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao salvar a venda.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md w-full overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-4 border-b bg-zinc-50 dark:bg-zinc-950">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold">
              {initialData ? 'Editar Venda' : 'Nova Venda'}
            </SheetTitle>
            <SheetDescription className="font-medium">
              Insira as informações da venda para automatizar finanças e agenda.
            </SheetDescription>
          </SheetHeader>
        </div>
        <ScrollArea className="flex-1 p-6">
          <Form {...form}>
            <form id="venda-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pr-1">
              <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <FormLabel className="font-bold text-black dark:text-white">Paciente *</FormLabel>
                  {!initialData && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/10"
                      onClick={() => {
                        setIsCreatingPatient(!isCreatingPatient)
                        form.setValue('paciente_id', !isCreatingPatient ? 'novo' : '')
                      }}
                    >
                      {isCreatingPatient ? (
                        'Selecionar Existente'
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1" /> Criar Novo
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {isCreatingPatient ? (
                  <div className="grid grid-cols-1 gap-3 animate-fade-in">
                    <div className="space-y-1">
                      <FormLabel className="text-xs font-semibold">Nome Completo *</FormLabel>
                      <Input
                        required
                        value={newPatient.nome}
                        onChange={(e) => setNewPatient({ ...newPatient, nome: e.target.value })}
                        placeholder="João da Silva"
                        className="bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <FormLabel className="text-xs font-semibold">Telefone</FormLabel>
                      <Input
                        value={newPatient.telefone}
                        onChange={(e) => setNewPatient({ ...newPatient, telefone: e.target.value })}
                        placeholder="(11) 99999-9999"
                        className="bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="paciente_id"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!initialData}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-zinc-900 font-medium">
                              <SelectValue placeholder="Selecione o paciente..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="novo" className="hidden">
                              Novo Paciente...
                            </SelectItem>
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
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-medium">
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
                    <FormItem className="flex flex-col pt-1">
                      <FormLabel className="font-bold">Data da Venda *</FormLabel>
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
                        <FormLabel className="font-bold">Data da Cirurgia</FormLabel>
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
                        <FormLabel className="font-bold">Início do Tratamento</FormLabel>
                        <DatePicker date={field.value} setDate={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 bg-zinc-100 dark:bg-zinc-900/80 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <FormField
                  control={form.control}
                  name="valor_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Valor Total (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="font-medium bg-white dark:bg-zinc-950"
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
                      <FormLabel className="font-bold">Desconto (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="font-medium bg-white dark:bg-zinc-950"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-2 flex justify-between items-center font-bold pt-3 mt-1 border-t border-zinc-200 dark:border-zinc-700 text-primary text-lg">
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
                      <FormLabel className="font-bold text-green-700 dark:text-green-500">
                        Entrada Paga (R$)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="font-medium"
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
                      <FormLabel className="font-bold">Parcelas (Saldo)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          className="font-medium"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-2 flex justify-between font-bold text-destructive bg-red-50 dark:bg-red-950/30 p-3 rounded-md border border-red-100 dark:border-red-900/50">
                  <span>Saldo Restante a Pagar</span>
                  <span>R$ {saldo.toFixed(2)}</span>
                </div>
              </div>

              {(tipo === 'tratamento' || tipo === 'cirurgia_tratamento') && (
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <FormLabel className="font-bold text-black dark:text-white block mb-1">
                    Pacote de Tratamentos (Sessões)
                  </FormLabel>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="sessoes_meso"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Meso</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-8 font-medium bg-white dark:bg-zinc-900"
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
                          <FormLabel className="text-xs">PRP</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-8 font-medium bg-white dark:bg-zinc-900"
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
                          <FormLabel className="text-xs">Botox</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-8 font-medium bg-white dark:bg-zinc-900"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">O que está incluído / Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: PRP 5 sessões + Mesoterapia 3 sessões..."
                        className="font-medium resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        <div className="p-6 border-t bg-white dark:bg-zinc-900 mt-auto">
          <Button
            form="venda-form"
            type="submit"
            className="w-full font-bold h-12 text-base shadow-md"
          >
            {initialData ? 'Salvar Alterações' : 'Confirmar Venda e Automatizar'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
