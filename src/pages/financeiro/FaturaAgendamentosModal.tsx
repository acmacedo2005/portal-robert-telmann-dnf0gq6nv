import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Clock, User, AlertCircle } from 'lucide-react'

const formatDateSafe = (dateStr: string | undefined) => {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10).split('-').reverse().join('/')
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'agendado':
      return 'bg-blue-100 text-blue-800'
    case 'realizada':
      return 'bg-green-100 text-green-800'
    case 'cancelado':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-zinc-100 text-zinc-800'
  }
}

export function FaturaAgendamentosModal({ fatura, isOpen, onClose }: any) {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen || !fatura?.paciente_id) return

    const loadData = async () => {
      try {
        setLoading(true)
        const ags = await pb.collection('agendamentos').getFullList({
          filter: `paciente_id = '${fatura.paciente_id}'`,
          sort: '-data_agendamento,-hora_agendamento',
          expand: 'profissional_id',
        })
        setAgendamentos(ags)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [isOpen, fatura])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Contexto Clínico - Agendamentos
          </DialogTitle>
          <DialogDescription>
            Histórico de agendamentos para o paciente:{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {fatura?.expand?.paciente_id?.nome}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : agendamentos.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum agendamento encontrado para este paciente.</p>
            </div>
          ) : (
            agendamentos.map((ag) => (
              <Card key={ag.id} className="overflow-hidden">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      {formatDateSafe(ag.data_agendamento)}
                      {ag.hora_agendamento && (
                        <span className="flex items-center gap-1 ml-2 text-zinc-500">
                          <Clock className="w-3.5 h-3.5" />
                          {ag.hora_agendamento}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <User className="w-4 h-4 text-zinc-400" />
                      {ag.tipo} com {ag.expand?.profissional_id?.name || 'Não atribuído'}
                    </div>
                    {ag.observacoes && (
                      <p className="text-xs text-zinc-500 mt-2 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-md">
                        {ag.observacoes}
                      </p>
                    )}
                  </div>
                  <Badge className={`uppercase text-[10px] ${getStatusColor(ag.status)}`}>
                    {ag.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
