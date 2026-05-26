import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import pb from '@/lib/pocketbase/client'
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
import { getPacientes, createPaciente } from '@/services/pacientes'
import { useToast } from '@/hooks/use-toast'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const formSchema = z.object({
  paciente_id: z.string().min(1, 'Paciente é obrigatório'),
  vendedor_id: z.string().min(1, 'Vendedor é obrigatório'),
  tipo_servico_id: z.string().min(1, 'Serviço é obrigatório'),
  data_venda: z.string(),
  valor_total: z.number().min(0),
  valor_desconto: z.number().min(0).default(0),
  forma_pagamento: z.string().min(1, 'Forma de pagamento é obrigatória'),
  quantidade_tratamento_total: z.number().min(0).default(0),
  quantidade_prp: z.number().min(0).default(0),
  quantidade_mesoterapia: z.number().min(0).default(0),
  parcelas: z.number().min(1).default(1),
  entrada: z.number().min(0).default(0),
  valor_parcela: z.number().min(0).default(0),
  observacoes: z.string().optional(),
  status: z.string().default('pendente'),
})

const pacienteSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  data_nascimento: z.string().optional(),
  genero: z.string().optional(),
})

export default function VendaForm({ isOpen, onClose, initialData, onSuccess }: any) {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [tiposServico, setTiposServico] = useState<any[]>([])
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newPatientOpen, setNewPatientOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valor_total: 0,
      valor_desconto: 0,
      entrada: 0,
      parcelas: 1,
      valor_parcela: 0,
      quantidade_tratamento_total: 0,
      quantidade_prp: 0,
      quantidade_mesoterapia: 0,
      forma_pagamento: 'Não informado',
      data_venda: new Date().toISOString().split('T')[0],
      observacoes: '',
      status: 'pendente',
    },
  })

  const watchTotal = form.watch('valor_total')
  const watchEntrada = form.watch('entrada')
  const watchParcelas = form.watch('parcelas')

  useEffect(() => {
    const total = watchTotal || 0
    const entrada = watchEntrada || 0
    const parcelas = watchParcelas || 1
    const valorParcela = (total - entrada) / parcelas
    form.setValue('valor_parcela', Math.max(0, valorParcela))
  }, [watchTotal, watchEntrada, watchParcelas, form])

  const patientForm = useForm<z.infer<typeof pacienteSchema>>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      endereco: '',
      cidade: '',
      estado: '',
      data_nascimento: '',
      genero: '',
    },
  })

  useEffect(() => {
    getPacientes().then(setPacientes)
    pb.collection('vendedores')
      .getFullList({ sort: 'nome_completo' })
      .then(setVendedores)
      .catch(() => {})
    pb.collection('tipos_servico')
      .getFullList({ sort: 'nome' })
      .then(setTiposServico)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isOpen && !initialData) {
      form.reset({
        data_venda: new Date().toISOString().split('T')[0],
        valor_total: 0,
        valor_desconto: 0,
        entrada: 0,
        parcelas: 1,
        valor_parcela: 0,
        quantidade_tratamento_total: 0,
        quantidade_prp: 0,
        quantidade_mesoterapia: 0,
        paciente_id: '',
        vendedor_id: '',
        tipo_servico_id: '',
        forma_pagamento: 'Não informado',
        observacoes: '',
        status: 'pendente',
      })
    } else if (initialData && isOpen) {
      form.reset({
        paciente_id: initialData.paciente_id,
        vendedor_id: initialData.vendedor_id || '',
        tipo_servico_id: initialData.tipo_servico_id || '',
        data_venda: initialData.data_venda
          ? initialData.data_venda.substring(0, 10)
          : new Date().toISOString().split('T')[0],
        valor_total: initialData.valor_total || 0,
        valor_desconto: initialData.valor_desconto || 0,
        entrada: initialData.entrada || 0,
        parcelas: initialData.parcelas || 1,
        valor_parcela: initialData.valor_parcela || 0,
        quantidade_tratamento_total: initialData.quantidade_tratamento_total || 0,
        quantidade_prp: initialData.quantidade_prp || 0,
        quantidade_mesoterapia: initialData.quantidade_mesoterapia || 0,
        forma_pagamento: initialData.forma_pagamento || 'Não informado',
        observacoes: initialData.observacoes || '',
        status: initialData.status || 'pendente',
      })
    }
  }, [initialData, isOpen, form])

  const handlePatientSubmit = async (data: z.infer<typeof pacienteSchema>) => {
    try {
      const p = await createPaciente(data)
      setPacientes((prev) => [...prev, p].sort((a, b) => a.nome.localeCompare(b.nome)))
      form.setValue('paciente_id', p.id)
      setNewPatientOpen(false)
      toast({ title: 'Paciente registrado com sucesso!' })
    } catch (e) {
      toast({ title: 'Erro ao registrar paciente', variant: 'destructive' })
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...values,
        data_venda: new Date(values.data_venda + 'T12:00:00.000Z').toISOString(),
      }

      if (initialData) {
        await pb.collection('vendas').update(initialData.id, payload)
        toast({ title: 'Venda atualizada com sucesso!' })
      } else {
        await pb.collection('vendas').create(payload)
        toast({ title: 'Venda criada com sucesso!' })
      }
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Falha ao salvar a venda.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-2xl w-full flex flex-col p-0 bg-white dark:bg-zinc-950">
          <div className="p-6 border-b bg-zinc-50 dark:bg-zinc-900 shadow-sm z-10 flex justify-between items-center">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold">
                {initialData ? 'Editar Venda' : 'Nova Venda'}
              </SheetTitle>
              <SheetDescription>
                {initialData
                  ? 'Edite as informações da venda.'
                  : 'Registre uma nova venda e acompanhamentos.'}
              </SheetDescription>
            </SheetHeader>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-6">
            <Form {...form}>
              <form
                id="venda-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 pb-20"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paciente_id"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Paciente *</FormLabel>
                          {!initialData && (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => setNewPatientOpen(true)}
                            >
                              + Novo
                            </Button>
                          )}
                        </div>
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
                  <FormField
                    control={form.control}
                    name="data_venda"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da Venda *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tipo_servico_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Serviço *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tiposServico.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vendedor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendedor *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vendedores.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.nome_completo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="valor_total"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total (R$) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
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
                    name="valor_desconto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desconto (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="forma_pagamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[
                              'Dinheiro',
                              'Cartão de Crédito',
                              'Cartão de Débito',
                              'PIX',
                              'Boleto',
                              'Transferência',
                              'Cheque',
                              'Não informado',
                            ].map((op) => (
                              <SelectItem key={op} value={op}>
                                {op}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="entrada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entrada (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
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
                        <FormLabel>Qtd. Parcelas</FormLabel>
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
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border flex items-center justify-between">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Valor da Parcela:
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      form.watch('valor_parcela'),
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="quantidade_tratamento_total"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tratamentos (Total)</FormLabel>
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
                    name="quantidade_prp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qtd PRP</FormLabel>
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
                    name="quantidade_mesoterapia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qtd Meso</FormLabel>
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
                </div>

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </ScrollArea>

          <div className="p-5 border-t bg-zinc-50 dark:bg-zinc-900 z-10 flex gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              form="venda-form"
              type="submit"
              className="flex-[2] h-12 text-md font-bold shadow-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={newPatientOpen} onOpenChange={setNewPatientOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
          </DialogHeader>
          <Form {...patientForm}>
            <form
              onSubmit={patientForm.handleSubmit(handlePatientSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={patientForm.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={patientForm.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={patientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewPatientOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar e Selecionar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
