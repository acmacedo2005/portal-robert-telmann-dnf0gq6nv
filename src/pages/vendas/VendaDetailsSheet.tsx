import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  Calendar,
  DollarSign,
  MessageSquare,
  ShoppingCart,
  User,
  Clock,
  AlertCircle,
} from 'lucide-react'

const formatCurrency = (value: number | undefined) => {
  if (value === undefined || value === null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

const formatDateSafe = (dateStr: string | Date | undefined) => {
  if (!dateStr) return '-'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return d.toISOString().slice(0, 10).split('-').reverse().join('/')
}

type TimelineItem = {
  id: string
  date: Date
  type: 'sale' | 'appointment' | 'payment' | 'observation'
  title: string
  description: string
  status?: string
  value?: number
}

const TypeIcon = ({ type }: { type: TimelineItem['type'] }) => {
  switch (type) {
    case 'sale':
      return <ShoppingCart className="w-4 h-4 text-blue-500" />
    case 'appointment':
      return <Calendar className="w-4 h-4 text-purple-500" />
    case 'payment':
      return <DollarSign className="w-4 h-4 text-green-500" />
    case 'observation':
      return <MessageSquare className="w-4 h-4 text-orange-500" />
  }
}

export function VendaDetailsSheet({ venda, isOpen, onClose }: any) {
  const [loading, setLoading] = useState(true)
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])

  useEffect(() => {
    if (!isOpen || !venda?.paciente_id) return

    const loadData = async () => {
      try {
        setLoading(true)
        const [ags, pags, parcs, obsResp] = await Promise.all([
          pb.collection('agendamentos').getFullList({
            filter: `paciente_id = '${venda.paciente_id}'`,
            expand: 'profissional_id',
          }),
          pb.collection('pagamentos').getFullList({
            filter: `fatura_id.paciente_id = '${venda.paciente_id}'`,
          }),
          pb.collection('parcelas_venda').getFullList({
            filter: `venda_id.paciente_id = '${venda.paciente_id}' && status = 'paga'`,
            expand: 'venda_id',
          }),
          pb.collection('observacoes_paciente').getFullList({
            filter: `paciente_id = '${venda.paciente_id}'`,
          }),
        ])

        const items: TimelineItem[] = []

        // Venda itself
        items.push({
          id: venda.id,
          date: new Date(venda.data_venda),
          type: 'sale',
          title: 'Venda Registrada',
          description: `Tipo: ${venda.tipo?.replace('_', ' ') || '-'}`,
          value: venda.valor_total,
          status: venda.status,
        })

        // Agendamentos
        ags.forEach((ag: any) => {
          items.push({
            id: ag.id,
            date: new Date(ag.data_agendamento),
            type: 'appointment',
            title: `Agendamento: ${ag.tipo}`,
            description: `Profissional: ${ag.expand?.profissional_id?.name || '-'} ${ag.hora_agendamento ? `| Horário: ${ag.hora_agendamento}` : ''}`,
            status: ag.status,
          })
        })

        // Pagamentos Faturas
        pags.forEach((p: any) => {
          items.push({
            id: p.id,
            date: new Date(p.data_pagamento),
            type: 'payment',
            title: `Pagamento de Fatura`,
            description: `Método: ${p.metodo?.replace('_', ' ') || '-'}`,
            value: p.valor_pago,
          })
        })

        // Pagamentos Parcelas
        parcs.forEach((p: any) => {
          if (p.data_pagamento) {
            items.push({
              id: p.id,
              date: new Date(p.data_pagamento),
              type: 'payment',
              title: `Pagamento de Parcela (${p.numero_parcela})`,
              description: `Método: ${p.forma_pagamento?.replace('_', ' ') || '-'}`,
              value: p.valor_parcela,
            })
          }
        })

        // Observacoes
        obsResp.forEach((o: any) => {
          items.push({
            id: o.id,
            date: new Date(o.data || o.created),
            type: 'observation',
            title: 'Anotação / Observação',
            description: o.observacao,
          })
        })

        items.sort((a, b) => b.date.getTime() - a.date.getTime())

        setTimeline(items)
        setAgendamentos(
          ags.sort(
            (a: any, b: any) =>
              new Date(b.data_agendamento).getTime() - new Date(a.data_agendamento).getTime(),
          ),
        )
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, venda])

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md w-full flex flex-col p-0">
        <div className="p-6 border-b bg-zinc-50 dark:bg-zinc-900 shadow-sm z-10">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Detalhes & Timeline
            </SheetTitle>
            <SheetDescription>
              Acompanhamento completo de{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">
                {venda?.expand?.paciente_id?.nome}
              </strong>
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 p-6">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6">
              <TabsTrigger value="timeline">Timeline do Paciente</TabsTrigger>
              <TabsTrigger value="history">Histórico Clínico</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="animate-fade-in">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  Nenhum evento registrado na timeline.
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-6 pb-8">
                  {timeline.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="relative">
                      <div className="absolute -left-[33px] top-0 bg-white dark:bg-zinc-950 rounded-full p-1 border-2 border-zinc-200 dark:border-zinc-800">
                        <TypeIcon type={item.type} />
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-semibold text-zinc-500">
                            {formatDateSafe(item.date)}
                          </p>
                          {item.status && (
                            <Badge variant="secondary" className="uppercase text-[10px]">
                              {item.status}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
                          {item.title}
                        </h4>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                          {item.description}
                        </p>
                        {item.value !== undefined && (
                          <p className="font-bold text-sm text-green-600 dark:text-green-500">
                            {formatCurrency(item.value)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="animate-fade-in">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : agendamentos.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhum agendamento clínico encontrado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agendamentos.map((ag) => (
                    <Card key={ag.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="font-semibold text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-500" />
                            {formatDateSafe(ag.data_agendamento)}
                            {ag.hora_agendamento && (
                              <span className="text-zinc-500 flex items-center gap-1 font-normal">
                                <Clock className="w-3.5 h-3.5" />
                                {ag.hora_agendamento}
                              </span>
                            )}
                          </div>
                          <Badge
                            variant={ag.status === 'realizada' ? 'default' : 'secondary'}
                            className="uppercase text-[10px]"
                          >
                            {ag.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                          <User className="w-4 h-4 text-zinc-400" />
                          {ag.tipo} com {ag.expand?.profissional_id?.name || '-'}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
