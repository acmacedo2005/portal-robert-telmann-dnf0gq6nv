import { useState, useMemo } from 'react'
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
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { UserPlus } from 'lucide-react'
import { addDays, subDays } from 'date-fns'

interface Props {
  pacientes: any[]
  profissionais: any[]
  onSuccess: () => void
}

export function AgendamentoForm({ pacientes, profissionais, onSuccess }: Props) {
  const [isCreatingPatient, setIsCreatingPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ nome: '', telefone: '', email: '' })
  const [selectedPacienteId, setSelectedPacienteId] = useState<string>('novo')
  const [formTipo, setFormTipo] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const [valorTotal, setValorTotal] = useState<number>(0)
  const [desconto, setDesconto] = useState<number>(0)
  const [entrada, setEntrada] = useState<number>(0)
  const saldoRestante = useMemo(
    () => Math.max(0, valorTotal - desconto - entrada),
    [valorTotal, desconto, entrada],
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    try {
      let pId = selectedPacienteId
      if (isCreatingPatient || selectedPacienteId === 'novo') {
        if (!newPatient.nome) throw new Error('Nome do paciente é obrigatório.')
        const p = await pb.collection('pacientes').create(newPatient)
        pId = p.id
      }
      if (!pId || pId === 'novo') throw new Error('Selecione ou cadastre um paciente.')

      const dataBase = {
        paciente_id: pId,
        data_agendamento: new Date(formData.get('data_agendamento') as string).toISOString(),
        hora_agendamento: formData.get('hora_agendamento') as string,
        profissional_id: formData.get('profissional_id') as string,
        status: 'agendado',
      }

      if (formTipo === 'cirurgia' || formTipo === 'cirurgia_tratamento') {
        const cirurgia = await pb.collection('cirurgias').create({
          paciente_id: pId,
          data_cirurgia: dataBase.data_agendamento,
          medico_id: dataBase.profissional_id,
          valor_total: valorTotal,
          entrada_paga: entrada,
          saldo_restante: saldoRestante,
          status: 'agendada',
          observacoes: formData.get('incluido') as string,
        })

        const venda = await pb.collection('vendas').create({
          paciente_id: pId,
          tipo: formTipo,
          valor_total: valorTotal,
          desconto_cortesia: desconto,
          valor_final: valorTotal - desconto,
          entrada_paga: entrada,
          saldo_restante: saldoRestante,
          status: saldoRestante === 0 ? 'paga' : entrada > 0 ? 'parcial' : 'pendente',
          data_venda: new Date().toISOString(),
          data_cirurgia: dataBase.data_agendamento,
        })

        if (entrada > 0) {
          await pb.collection('faturas').create({
            paciente_id: pId,
            cirurgia_id: cirurgia.id,
            venda_id: venda.id,
            valor: entrada,
            data_vencimento: new Date().toISOString(),
            status: 'paga',
            tipo_parcela: 'entrada',
            tipo: 'cirurgia',
          })
        }
        if (saldoRestante > 0) {
          await pb.collection('faturas').create({
            paciente_id: pId,
            cirurgia_id: cirurgia.id,
            venda_id: venda.id,
            valor: saldoRestante,
            data_vencimento: dataBase.data_agendamento,
            status: 'pendente',
            tipo_parcela: 'saldo',
            tipo: 'cirurgia',
          })
        }

        const dCir = new Date(dataBase.data_agendamento)

        await pb.collection('agendamentos').create({
          ...dataBase,
          tipo: 'avaliacao',
          data_agendamento: subDays(dCir, 7).toISOString(),
          cirurgia_id: cirurgia.id,
          observacoes: 'Pré-cirúrgico',
        })

        await pb.collection('agendamentos').create({
          ...dataBase,
          tipo: 'cirurgia',
          cirurgia_id: cirurgia.id,
          observacoes: formData.get('observacoes') as string,
        })

        for (const d of [10, 30, 90, 180, 365]) {
          await pb.collection('agendamentos').create({
            ...dataBase,
            tipo: 'retorno',
            data_agendamento: addDays(dCir, d).toISOString(),
            cirurgia_id: cirurgia.id,
            observacoes: `Retorno ${d} dias`,
          })
        }

        if (formTipo === 'cirurgia_tratamento') {
          const subtipo = formData.get('subtipo') as string
          const sessoesTotal = Number(formData.get('sessoes_total') || 1)
          const saldo = await pb.collection('saldo_tratamentos').create({
            venda_id: venda.id,
            paciente_id: pId,
            tipo_tratamento: subtipo,
            sessoes_total: sessoesTotal,
            sessoes_restantes: sessoesTotal,
            sessoes_realizadas: 0,
            incluido_no_pacote: true,
            status: 'ativo',
          })

          const dataInicioStr = formData.get('data_inicio_tratamento') as string
          const dInicio = dataInicioStr ? new Date(dataInicioStr) : dCir
          for (let i = 0; i < sessoesTotal; i++) {
            await pb.collection('agendamentos').create({
              paciente_id: pId,
              profissional_id: dataBase.profissional_id,
              status: 'agendado',
              tipo: 'aplicacao',
              data_agendamento: addDays(dInicio, i * 7).toISOString(),
              saldo_tratamento_id: saldo.id,
              observacoes: `Sessão ${i + 1} de ${sessoesTotal} (${subtipo})`,
            })
          }
        }
      } else if (formTipo === 'tratamento') {
        const subtipo = formData.get('subtipo') as string
        const sessoesTotal = Number(formData.get('sessoes_total') || 1)
        const saldo = await pb.collection('saldo_tratamentos').create({
          paciente_id: pId,
          tipo_tratamento: subtipo,
          sessoes_total: sessoesTotal,
          sessoes_restantes: sessoesTotal,
          sessoes_realizadas: 0,
          incluido_no_pacote: false,
          status: 'ativo',
        })

        const dInicio = new Date(dataBase.data_agendamento)
        for (let i = 0; i < sessoesTotal; i++) {
          await pb.collection('agendamentos').create({
            ...dataBase,
            tipo: 'aplicacao',
            data_agendamento: addDays(dInicio, i * 7).toISOString(),
            saldo_tratamento_id: saldo.id,
            observacoes: `Sessão ${i + 1} de ${sessoesTotal} (${subtipo})`,
          })
        }
      } else {
        await pb.collection('agendamentos').create({
          ...dataBase,
          tipo: formTipo,
          observacoes: formData.get('observacoes') as string,
        })
      }

      toast.success('Agendamento criado com sucesso')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Falha ao criar o agendamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <Label className="font-bold">Paciente</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-bold text-primary"
            onClick={() => setIsCreatingPatient(!isCreatingPatient)}
          >
            {isCreatingPatient ? (
              'Selecionar Existente'
            ) : (
              <>
                <UserPlus className="w-3 h-3 mr-1" /> Criar Novo
              </>
            )}
          </Button>
        </div>
        {isCreatingPatient ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input
                required
                value={newPatient.nome}
                onChange={(e) => setNewPatient({ ...newPatient, nome: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input
                value={newPatient.telefone}
                onChange={(e) => setNewPatient({ ...newPatient, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={newPatient.email}
                onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <Select value={selectedPacienteId} onValueChange={setSelectedPacienteId} required>
            <SelectTrigger className="font-medium">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="novo" disabled className="hidden">
                Selecione...
              </SelectItem>
              {pacientes.map((p) => (
                <SelectItem key={p.id} value={p.id} className="font-medium">
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-bold">Tipo de Agendamento *</Label>
          <Select value={formTipo} onValueChange={setFormTipo} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cirurgia">Cirurgia</SelectItem>
              <SelectItem value="tratamento">Tratamento</SelectItem>
              <SelectItem value="cirurgia_tratamento">Cirurgia + Tratamento</SelectItem>
              <SelectItem value="avaliacao">Avaliação</SelectItem>
              <SelectItem value="retorno">Retorno</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="font-bold">Profissional *</Label>
          <Select name="profissional_id" required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {profissionais.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name || m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-bold">
            {formTipo === 'tratamento'
              ? 'Data Início *'
              : formTipo === 'cirurgia' || formTipo === 'cirurgia_tratamento'
                ? 'Data Prevista Cirurgia *'
                : 'Data *'}
          </Label>
          <Input type="date" name="data_agendamento" required />
        </div>
        <div className="space-y-2">
          <Label className="font-bold">Hora</Label>
          <Input type="time" name="hora_agendamento" />
        </div>
      </div>

      {formTipo === 'cirurgia_tratamento' && (
        <div className="space-y-2">
          <Label className="font-bold">Data Início Tratamento *</Label>
          <Input type="date" name="data_inicio_tratamento" required />
        </div>
      )}

      {(formTipo === 'cirurgia' || formTipo === 'cirurgia_tratamento') && (
        <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <h4 className="font-bold text-primary text-sm uppercase tracking-wider">
            Detalhes Financeiros da Cirurgia
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Valor Total (R$)</Label>
              <Input
                type="number"
                step="0.01"
                name="valor_total"
                required
                value={valorTotal || ''}
                onChange={(e) => setValorTotal(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Desconto / Cortesia (R$)</Label>
              <Input
                type="number"
                step="0.01"
                name="desconto"
                value={desconto || ''}
                onChange={(e) => setDesconto(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Entrada Paga (R$)</Label>
              <Input
                type="number"
                step="0.01"
                name="entrada"
                value={entrada || ''}
                onChange={(e) => setEntrada(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Saldo Restante</Label>
              <Input
                readOnly
                value={formatCurrency(saldoRestante)}
                className="bg-zinc-100 dark:bg-zinc-800 font-bold"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">O que está incluído</Label>
            <Input name="incluido" placeholder="Ex: Kit pós-operatório..." />
          </div>
        </div>
      )}

      {(formTipo === 'tratamento' || formTipo === 'cirurgia_tratamento') && (
        <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-950 border rounded-lg">
          <h4 className="font-bold text-sm uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Detalhes do Tratamento
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Sub-tipo *</Label>
              <Select name="subtipo" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meso">Meso</SelectItem>
                  <SelectItem value="prp">PRP</SelectItem>
                  <SelectItem value="botox">Botox</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Sessões Total *</Label>
              <Input type="number" name="sessoes_total" min="1" required defaultValue="1" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="font-bold">Observações Adicionais</Label>
        <Input name="observacoes" placeholder="Anotações para o profissional..." />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 font-bold text-base mt-4 bg-primary text-black hover:bg-primary/90 transition-all"
      >
        {loading ? 'Salvando...' : 'Confirmar Agendamento'}
      </Button>
    </form>
  )
}
