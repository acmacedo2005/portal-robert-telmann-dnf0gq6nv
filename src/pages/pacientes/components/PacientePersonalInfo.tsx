import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updatePaciente } from '@/services/pacientes'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export default function PacientePersonalInfo({
  paciente,
  onUpdate,
}: {
  paciente: any
  onUpdate: (p: any) => void
}) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [ativo, setAtivo] = useState<boolean>(paciente.ativo !== false)
  const { user } = useAuth()

  const canEdit =
    user?.papel === 'admin' || paciente.criado_por === user?.id || !paciente.criado_por

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canEdit) {
      toast.error('Sem permissão para editar.')
      return
    }

    const formData = new FormData(e.currentTarget)
    const data: any = Object.fromEntries(formData.entries())

    if (data.data_nascimento) {
      data.data_nascimento = new Date(data.data_nascimento as string).toISOString()
    }

    data.ativo = ativo

    setLoading(true)
    setErrors({})
    try {
      const updated = await updatePaciente(paciente.id, data)
      onUpdate(updated)
      toast.success('Cadastro atualizado com sucesso')
    } catch (error) {
      const fieldErrors = extractFieldErrors(error)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      } else {
        toast.error('Erro ao atualizar dados')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome Completo / Social *</Label>
          <Input name="nome" defaultValue={paciente.nome} required disabled={!canEdit} />
          {errors.nome && <p className="text-red-500 text-sm">{errors.nome}</p>}
        </div>
        <div className="space-y-2">
          <Label>Nome Civil</Label>
          <Input name="civil_name" defaultValue={paciente.civil_name} disabled={!canEdit} />
        </div>

        <div className="space-y-2">
          <Label>ID Legado (Patient ID)</Label>
          <Input
            name="patient_id"
            defaultValue={paciente.patient_id}
            disabled={!canEdit}
            type="number"
          />
        </div>
        <div className="space-y-2">
          <Label>Status do Paciente</Label>
          <div className="flex items-center gap-2 mt-2">
            <Switch checked={ativo} onCheckedChange={setAtivo} disabled={!canEdit} />
            <span className="text-sm">{ativo ? 'Ativo' : 'Inativo'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>CPF *</Label>
          <Input name="cpf" defaultValue={paciente.cpf} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>RG</Label>
          <Input name="rg" defaultValue={paciente.rg} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input name="email" type="email" defaultValue={paciente.email} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Data Nascimento *</Label>
          <Input
            name="data_nascimento"
            type="date"
            defaultValue={paciente.data_nascimento?.split('T')[0]}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label>Telefone Celular *</Label>
          <Input name="telefone" defaultValue={paciente.telefone} required disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Telefone Residencial</Label>
          <Input name="home_phone" defaultValue={paciente.home_phone} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp</Label>
          <Input name="whatsapp" defaultValue={paciente.whatsapp} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>CEP</Label>
          <Input name="cep" defaultValue={paciente.cep} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Rua</Label>
          <Input name="rua" defaultValue={paciente.rua} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Número</Label>
          <Input name="numero" defaultValue={paciente.numero} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Complemento</Label>
          <Input name="complemento" defaultValue={paciente.complemento} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input name="cidade" defaultValue={paciente.cidade} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <Input name="estado" defaultValue={paciente.estado} maxLength={2} disabled={!canEdit} />
        </div>
      </div>
      {canEdit && (
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      )}
    </form>
  )
}
