import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updatePaciente, createPacienteLog, getPacienteLogs } from '@/services/pacientes'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'

export default function PacienteProntuario({
  paciente,
  onUpdate,
}: {
  paciente: any
  onUpdate: (p: any) => void
}) {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const { user } = useAuth()

  const canEdit = user?.papel === 'admin' || user?.papel === 'medico'

  useEffect(() => {
    getPacienteLogs(paciente.id)
      .then(setLogs)
      .catch(() => {})
  }, [paciente.id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canEdit) return toast.error('Sem permissão para editar.')

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    const medicalFields = [
      'anamnese',
      'diagnostico',
      'observacoes_clinicas',
      'contraindicacoes',
      'alergias',
      'medicamentos_em_uso',
    ]
    const changes: Record<string, any> = {}
    medicalFields.forEach((f) => {
      const oldVal = paciente[f] || ''
      const newVal = data[f] || ''
      if (oldVal !== newVal) {
        changes[f] = { from: oldVal, to: newVal }
      }
    })

    if (Object.keys(changes).length === 0) {
      return toast.info('Nenhuma alteração detectada.')
    }

    setLoading(true)
    try {
      const updated = await updatePaciente(paciente.id, data)
      onUpdate(updated)

      const log = await createPacienteLog({
        paciente_id: paciente.id,
        user_id: user.id,
        changes,
      })
      setLogs((prev) => [log, ...prev])

      toast.success('Prontuário atualizado com sucesso')
    } catch (error) {
      toast.error('Erro ao atualizar prontuário')
    } finally {
      setLoading(false)
    }
  }

  const lastLog = logs.length > 0 ? logs[0] : null
  const lastUpdateDate = lastLog ? format(new Date(lastLog.created), 'dd/MM/yyyy HH:mm') : null
  const lastUpdateUser = lastLog?.expand?.user_id?.nome || 'Desconhecido'

  return (
    <div className="space-y-6">
      {lastLog && (
        <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
          Última atualização: <strong>{lastUpdateDate}</strong> por{' '}
          <strong>{lastUpdateUser}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Anamnese</Label>
            <Textarea
              name="anamnese"
              defaultValue={paciente.anamnese}
              disabled={!canEdit}
              className="h-32"
            />
          </div>
          <div className="space-y-2">
            <Label>Diagnóstico</Label>
            <Textarea
              name="diagnostico"
              defaultValue={paciente.diagnostico}
              disabled={!canEdit}
              className="h-32"
            />
          </div>
          <div className="space-y-2">
            <Label>Observações Clínicas</Label>
            <Textarea
              name="observacoes_clinicas"
              defaultValue={paciente.observacoes_clinicas}
              disabled={!canEdit}
              className="h-32"
            />
          </div>
          <div className="space-y-2">
            <Label>Contraindicações</Label>
            <Textarea
              name="contraindicacoes"
              defaultValue={paciente.contraindicacoes}
              disabled={!canEdit}
              className="h-32"
            />
          </div>
          <div className="space-y-2">
            <Label>Alergias</Label>
            <Textarea
              name="alergias"
              defaultValue={paciente.alergias}
              disabled={!canEdit}
              className="h-32"
            />
          </div>
          <div className="space-y-2">
            <Label>Medicamentos em uso</Label>
            <Textarea
              name="medicamentos_em_uso"
              defaultValue={paciente.medicamentos_em_uso}
              disabled={!canEdit}
              className="h-32"
            />
          </div>
        </div>
        {canEdit && (
          <Button type="submit" disabled={loading} className="w-full sm:w-auto mt-4">
            {loading ? 'Salvando...' : 'Salvar Prontuário'}
          </Button>
        )}
      </form>
    </div>
  )
}
