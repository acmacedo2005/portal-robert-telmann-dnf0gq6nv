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
import { RecordModel } from 'pocketbase'

interface Props {
  agendamento: RecordModel
  profissionais: RecordModel[]
  onSuccess: () => void
}

export function AgendamentoEditForm({ agendamento, profissionais, onSuccess }: Props) {
  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      data_agendamento: new Date(formData.get('data_agendamento') as string).toISOString(),
      hora_agendamento: formData.get('hora_agendamento') as string,
      profissional_id: formData.get('profissional_id') as string,
      status: formData.get('status') as string,
      observacoes: formData.get('observacoes') as string,
    }
    try {
      await pb.collection('agendamentos').update(agendamento.id, data)
      toast.success('Agendamento atualizado com sucesso')
      onSuccess()
    } catch (error) {
      toast.error('Erro ao atualizar o agendamento.')
    }
  }

  return (
    <form onSubmit={handleEdit} className="space-y-5 mt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-bold text-zinc-700 dark:text-zinc-300">Data *</Label>
          <Input
            type="date"
            name="data_agendamento"
            defaultValue={agendamento.data_agendamento.split('T')[0]}
            required
            className="font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-zinc-700 dark:text-zinc-300">Hora</Label>
          <Input
            type="time"
            name="hora_agendamento"
            defaultValue={agendamento.hora_agendamento}
            className="font-medium"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="font-bold text-zinc-700 dark:text-zinc-300">Profissional *</Label>
        <Select name="profissional_id" defaultValue={agendamento.profissional_id} required>
          <SelectTrigger className="font-medium">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {profissionais.map((m) => (
              <SelectItem key={m.id} value={m.id} className="font-medium">
                {m.name || m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="font-bold text-zinc-700 dark:text-zinc-300">Situação</Label>
        <Select name="status" defaultValue={agendamento.status}>
          <SelectTrigger className="font-medium">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="realizada">Realizado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="font-bold text-zinc-700 dark:text-zinc-300">Observações</Label>
        <Input
          name="observacoes"
          defaultValue={agendamento.observacoes}
          placeholder="Informações adicionais..."
          className="font-medium"
        />
      </div>
      <Button
        type="submit"
        className="w-full h-12 font-bold bg-primary text-black hover:bg-primary/90 mt-2 transition-all"
      >
        Salvar Alterações
      </Button>
    </form>
  )
}
