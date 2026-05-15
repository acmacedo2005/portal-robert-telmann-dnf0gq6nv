import { useState } from 'react'
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
  const [tipo, setTipo] = useState<string>('')
  const [loading, setLoading] = useState(false)

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

      if (tipo === 'cirurgia') {
        const valorTotal = Number(formData.get('valor_total') || 0)
        const desconto = Number(formData.get('desconto') || 0)
        const entrada = Number(formData.get('entrada') || 0)
        const saldoRestante = valorTotal - desconto - entrada

        const cirurgia = await pb.collection('cirurgias').create({
          paciente_id: pId,
          data_cirurgia: dataBase.data_agendamento,
          medico_id: dataBase.profissional_id,
          valor_total: valorTotal,
          entrada_paga: entrada,
          saldo_restante: saldoRestante,
          status: 'agendada',
          observacoes: formData.get('observacoes') as string,
        })

        const venda = await pb.collection('vendas').create({
          paciente_id: pId,
          tipo: 'cirurgia',
          valor_total: valorTotal,
          desconto_cortesia: desconto,
          valor_final: valorTotal - desconto,
          entrada_paga: entrada,
          saldo_restante: saldoRestante,
          status: saldoRestante === 0 ? 'paga' : entrada > 0 ? 'parcial' : 'pendente',
          data_venda: new Date().toISOString(),
          data_cirurgia: dataBase.data_agendamento,
          sessoes_meso: Number(formData.get('sessoes_meso') || 0),
          sessoes_prp: Number(formData.get('sessoes_prp') || 0),
          sessoes_botox: Number(formData.get('sessoes_botox') || 0),
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

        for (const tt of ['meso', 'prp', 'botox']) {
          const amount = Number(formData.get(`sessoes_${tt}`) || 0)
          if (amount > 0) {
            await pb.collection('saldo_tratamentos').create({
              venda_id: venda.id,
              paciente_id: pId,
              tipo_tratamento: tt,
              sessoes_total: amount,
              sessoes_restantes: amount,
              sessoes_realizadas: 0,
              incluido_no_pacote: true,
              status: 'ativo',
            })
          }
        }

        const dCir = new Date(dataBase.data_agendamento)
        await pb.collection('agendamentos').create({
          ...dataBase,
          tipo: 'avaliacao',
          data_agendamento: subDays(dCir, 7).toISOString(),
          cirurgia_id: cirurgia.id,
          observacoes: 'Pré-cirúrgico',
        })
        await pb
          .collection('agendamentos')
          .create({ ...dataBase, tipo: 'cirurgia', cirurgia_id: cirurgia.id })

        for (const d of [10, 30, 90, 180, 365]) {
          await pb.collection('agendamentos').create({
            ...dataBase,
            tipo: 'retorno',
            data_agendamento: addDays(dCir, d).toISOString(),
            cirurgia_id: cirurgia.id,
            observacoes: `Retorno ${d} dias`,
          })
        }
      } else if (tipo === 'tratamento') {
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
            observacoes: `Sessão ${i + 1} de ${sessoesTotal}`,
          })
        }
      } else {
        await pb.collection('agendamentos').create({
          ...dataBase,
          tipo,
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
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="novo" disabled className="hidden">
                Selecione...
              </SelectItem>
              {pacientes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
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
          <Select value={tipo} onValueChange={setTipo} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cirurgia">Cirurgia</SelectItem>
              <SelectItem value="tratamento">Tratamento</SelectItem>
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
            {tipo === 'tratamento' ? 'Data de Início *' : 'Data *'}
          </Label>
          <Input type="date" name="data_agendamento" required />
        </div>
        <div className="space-y-2">
          <Label className="font-bold">Hora</Label>
          <Input type="time" name="hora_agendamento" />
        </div>
      </div>

      {tipo === 'cirurgia' && (
        <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <h4 className="font-bold text-primary text-sm">Detalhes Financeiros da Cirurgia</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Total (R$)</Label>
              <Input type="number" step="0.01" name="valor_total" required />
            </div>
            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input type="number" step="0.01" name="desconto" />
            </div>
            <div className="space-y-2">
              <Label>Entrada Paga (R$)</Label>
              <Input type="number" step="0.01" name="entrada" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>O que está incluído</Label>
            <Input name="observacoes" placeholder="Ex: 3 sessões de Meso..." />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Sessões Meso</Label>
              <Input type="number" name="sessoes_meso" defaultValue="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sessões PRP</Label>
              <Input type="number" name="sessoes_prp" defaultValue="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sessões Botox</Label>
              <Input type="number" name="sessoes_botox" defaultValue="0" />
            </div>
          </div>
        </div>
      )}

      {tipo === 'tratamento' && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="space-y-2">
            <Label className="font-bold">Sub-tipo *</Label>
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
            <Label className="font-bold">Sessões Total *</Label>
            <Input type="number" name="sessoes_total" min="1" required defaultValue="1" />
          </div>
        </div>
      )}

      {(tipo === 'avaliacao' || tipo === 'retorno') && (
        <div className="space-y-2">
          <Label className="font-bold">Observações</Label>
          <Input name="observacoes" placeholder="Anotações para o profissional..." />
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 font-bold text-base mt-4 bg-primary text-black hover:bg-primary/90"
      >
        {loading ? 'Salvando...' : 'Confirmar Agendamento'}
      </Button>
    </form>
  )
}
