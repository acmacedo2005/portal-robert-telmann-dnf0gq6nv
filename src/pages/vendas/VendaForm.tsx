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
import { getPacientes, createPaciente } from '@/services/pacientes'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trash2, Calculator, Plus, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

const formSchema = z.object({
  paciente_id: z.string().min(1, 'Paciente é obrigatório'),
  vendedor_id: z.string().min(1, 'Vendedor é obrigatório'),
  percentual_comissao: z.number().min(0).max(100).default(10),
  tipo: z.enum(['cirurgia', 'tratamento', 'cirurgia_tratamento']),
  data_venda: z.string(), // ISO string from date input for better native mobile support
  valor_total: z.number().min(0),
  desconto_cortesia: z.number().min(0).default(0),
  entrada_paga: z.number().min(0).default(0),
  observacoes: z.string().optional(),
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
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newPatientOpen, setNewPatientOpen] = useState(false)

  // Installments Generation State
  const [parcelasState, setParcelasState] = useState<any[]>([])
  const [gerador, setGerador] = useState({
    qtd: 1,
    formaEntrada: 'pix',
    formaDemais: 'cartao_credito',
    intervalo: 30,
    dataPrimeira: new Date().toISOString().split('T')[0],
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valor_total: 0,
      desconto_cortesia: 0,
      entrada_paga: 0,
      percentual_comissao: 10,
      data_venda: new Date().toISOString().split('T')[0],
      tipo: 'cirurgia',
      observacoes: '',
    },
  })

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
    pb.collection('users')
      .getFullList({ filter: "especialidade='vendedor' || papel='vendedor'" })
      .then(setVendedores)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isOpen && !initialData) {
      form.reset({
        data_venda: new Date().toISOString().split('T')[0],
        valor_total: 0,
        desconto_cortesia: 0,
        entrada_paga: 0,
        percentual_comissao: 10,
        paciente_id: '',
        vendedor_id: '',
        tipo: 'cirurgia',
        observacoes: '',
      })
      setParcelasState([])
      setGerador((prev) => ({ ...prev, dataPrimeira: new Date().toISOString().split('T')[0] }))
    } else if (initialData && isOpen) {
      form.reset({
        paciente_id: initialData.paciente_id,
        vendedor_id: initialData.vendedor_id || '',
        percentual_comissao: 10, // Might need to fetch from comissoes_vendedor if strictly needed
        tipo: initialData.tipo || 'cirurgia',
        data_venda: initialData.data_venda
          ? initialData.data_venda.substring(0, 10)
          : new Date().toISOString().split('T')[0],
        valor_total: initialData.valor_total || 0,
        desconto_cortesia: initialData.desconto_cortesia || 0,
        entrada_paga: initialData.entrada_paga || 0,
        observacoes: initialData.observacoes || '',
      })
      // When editing, we don't automatically load installments into the generator state,
      // edit is mainly for general data. To manage installments, user should use Parcelas Modal.
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
    if (gerador.qtd < 1 && saldo > 0) {
      toast({ title: 'Aviso', description: 'Número de parcelas inválido.', variant: 'destructive' })
      return
    }

    const newParcelas = []

    // Entrada
    if (entrada > 0) {
      newParcelas.push({
        numero_parcela: 1,
        valor_parcela: entrada,
        data_vencimento: form.watch('data_venda') + 'T12:00:00.000Z',
        forma_pagamento: gerador.formaEntrada,
        status: 'paga',
      })
    }

    // Demais parcelas
    if (saldo > 0 && gerador.qtd > 0) {
      const vParcela = saldo / gerador.qtd
      let dataAtual = new Date(gerador.dataPrimeira + 'T12:00:00.000Z')

      for (let i = 0; i < gerador.qtd; i++) {
        newParcelas.push({
          numero_parcela: (entrada > 0 ? 1 : 0) + i + 1,
          valor_parcela: vParcela,
          data_vencimento: dataAtual.toISOString(),
          forma_pagamento: gerador.formaDemais,
          status: 'pendente',
        })
        dataAtual = addDays(dataAtual, gerador.intervalo)
      }
    }
    setParcelasState(newParcelas)
    toast({ title: 'Parcelas geradas com sucesso!' })
  }

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
      if (!initialData && parcelasState.length === 0 && valFinal > 0) {
        toast({
          title: 'Aviso',
          description: 'Gere as parcelas antes de salvar a venda.',
          variant: 'destructive',
        })
        setIsSubmitting(false)
        return
      }

      const isAllPaid = parcelasState.length > 0 && parcelasState.every((p) => p.status === 'paga')
      const isAnyPaid = parcelasState.some((p) => p.status === 'paga')
      const statusVenda = isAllPaid ? 'paga' : isAnyPaid ? 'parcial' : 'pendente'

      const payload = {
        ...values,
        data_venda: new Date(values.data_venda + 'T12:00:00.000Z').toISOString(),
        valor_final: valFinal,
        saldo_restante: saldo,
        status: initialData ? initialData.status : statusVenda, // keep original status if editing
      }

      if (initialData) {
        await pb.collection('vendas').update(initialData.id, payload)
        toast({ title: 'Venda atualizada com sucesso!' })
      } else {
        const venda = await pb.collection('vendas').create(payload)

        // Create installments
        for (const p of parcelasState) {
          await pb.collection('parcelas_venda').create({
            venda_id: venda.id,
            numero_parcela: p.numero_parcela,
            valor_parcela: p.valor_parcela,
            data_vencimento: p.data_vencimento,
            forma_pagamento: p.forma_pagamento,
            status: p.status,
            data_pagamento: p.status === 'paga' ? new Date().toISOString() : null,
          })
        }

        // Create commission
        const valorComissao = (valFinal * values.percentual_comissao) / 100
        await pb.collection('comissoes_vendedor').create({
          vendedor_id: values.vendedor_id,
          venda_id: venda.id,
          percentual_comissao: values.percentual_comissao,
          valor_comissao: valorComissao,
          status: 'pendente',
          data_calculo: new Date().toISOString(),
        })

        toast({ title: 'Venda e parcelas criadas com sucesso!' })
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
                {initialData ? 'Editar Venda' : 'Nova Venda (Wizard)'}
              </SheetTitle>
              <SheetDescription>
                {initialData
                  ? 'Edite as informações gerais da venda.'
                  : 'Preencha os dados e gere as parcelas automaticamente.'}
              </SheetDescription>
            </SheetHeader>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-6">
            <Form {...form}>
              <form id="venda-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Paciente & Vendedor Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="paciente_id"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel className="font-semibold text-zinc-700 dark:text-zinc-300">
                              Paciente *
                            </FormLabel>
                            {!initialData && (
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-6 text-xs text-primary"
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
                              <SelectTrigger className="bg-white dark:bg-zinc-900">
                                <SelectValue placeholder="Selecione um paciente..." />
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
                  </div>

                  <FormField
                    control={form.control}
                    name="vendedor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-zinc-700 dark:text-zinc-300">
                          Vendedor *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-zinc-900">
                              <SelectValue placeholder="Selecione um vendedor..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vendedores.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.name || v.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-zinc-700 dark:text-zinc-300">
                          Tipo *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-zinc-900">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cirurgia">Cirurgia</SelectItem>
                            <SelectItem value="tratamento">Tratamento</SelectItem>
                            <SelectItem value="cirurgia_tratamento">
                              Cirurgia + Tratamento
                            </SelectItem>
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
                        <FormLabel className="font-semibold text-zinc-700 dark:text-zinc-300">
                          Data da Venda *
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="bg-white dark:bg-zinc-900" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="percentual_comissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-zinc-700 dark:text-zinc-300">
                          Comissão (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            className="bg-white dark:bg-zinc-900"
                            disabled={!!initialData}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Financial Values */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-100 dark:bg-zinc-800/50 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <FormField
                    control={form.control}
                    name="valor_total"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-zinc-900 dark:text-zinc-100">
                          Valor Total (R$)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="font-bold text-lg bg-white dark:bg-zinc-900 h-12"
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
                    name="entrada_paga"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-zinc-900 dark:text-zinc-100">
                          Entrada Paga (R$)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="font-bold text-lg bg-white dark:bg-zinc-900 h-12"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={!!initialData}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-lg mt-2 shadow-sm border border-zinc-200 dark:border-zinc-800 gap-2">
                    <div className="text-center md:text-left w-full">
                      <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
                        Valor Final
                      </p>
                      <p className="font-black text-xl text-zinc-800 dark:text-zinc-200">
                        R$ {valFinal.toFixed(2)}
                      </p>
                    </div>
                    <div className="h-px w-full md:w-px md:h-10 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="text-center md:text-right w-full">
                      <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
                        Saldo a Parcelar
                      </p>
                      <p className="font-black text-xl text-primary">R$ {saldo.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Observações
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-white dark:bg-zinc-900"
                          placeholder="Anotações adicionais..."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Installments Generator (Only for new sales) */}
                {!initialData && (
                  <div className="mt-8 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                    <div className="bg-zinc-100 dark:bg-zinc-950 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-primary" />
                      <h4 className="font-bold text-md text-zinc-800 dark:text-zinc-200">
                        Gerador de Parcelas
                      </h4>
                    </div>
                    <div className="p-5 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                            Nº de Parcelas (Saldo)
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={gerador.qtd}
                            onChange={(e) =>
                              setGerador({ ...gerador, qtd: Number(e.target.value) })
                            }
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                            Venc. 1ª Parcela
                          </Label>
                          <Input
                            type="date"
                            value={gerador.dataPrimeira}
                            onChange={(e) =>
                              setGerador({ ...gerador, dataPrimeira: e.target.value })
                            }
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                            Intervalo (Dias)
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={gerador.intervalo}
                            onChange={(e) =>
                              setGerador({ ...gerador, intervalo: Number(e.target.value) })
                            }
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                            Forma Pgto. Entrada
                          </Label>
                          <Select
                            value={gerador.formaEntrada}
                            onValueChange={(v) => setGerador({ ...gerador, formaEntrada: v })}
                          >
                            <SelectTrigger className="h-10">
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
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                            Forma Pgto. Parcelas
                          </Label>
                          <Select
                            value={gerador.formaDemais}
                            onValueChange={(v) => setGerador({ ...gerador, formaDemais: v })}
                          >
                            <SelectTrigger className="h-10">
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
                        className="w-full h-12 text-md font-bold shadow-sm"
                        onClick={gerarParcelas}
                      >
                        Calcular & Gerar Tabela
                      </Button>

                      {parcelasState.length > 0 && (
                        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden mt-4">
                          <Table>
                            <TableHeader className="bg-zinc-50 dark:bg-zinc-950">
                              <TableRow>
                                <TableHead className="w-12 text-center">Nº</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Forma</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parcelasState.map((p, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-center font-bold">
                                    {p.numero_parcela}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      className="h-8 w-24 font-bold"
                                      value={p.valor_parcela.toFixed(2)}
                                      onChange={(e) => {
                                        const ns = [...parcelasState]
                                        ns[idx].valor_parcela = Number(e.target.value)
                                        setParcelasState(ns)
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {format(new Date(p.data_vencimento), 'dd/MM/yyyy')}
                                  </TableCell>
                                  <TableCell className="text-xs uppercase">
                                    {p.forma_pagamento.replace('_', ' ')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500"
                                      onClick={() =>
                                        setParcelasState(parcelasState.filter((_, i) => i !== idx))
                                      }
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </ScrollArea>

          <div className="p-5 border-t bg-zinc-50 dark:bg-zinc-900 mt-auto z-10 flex gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
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
              {isSubmitting
                ? 'Salvando...'
                : initialData
                  ? 'Salvar Alterações'
                  : 'Confirmar Venda e Salvar'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* New Patient Dialog */}
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
              <div className="grid grid-cols-2 gap-4">
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
                  name="data_nascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nascimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
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
