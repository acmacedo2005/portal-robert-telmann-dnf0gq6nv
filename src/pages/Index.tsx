import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, Cirurgia, Fatura, Paciente } from '@/services/db'
import { useRealtime } from '@/hooks/use-realtime'
import { Users, Activity, DollarSign, AlertCircle } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

export default function Index() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([])
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const [p, c, f] = await Promise.all([
        api.pacientes.list(),
        api.cirurgias.list(),
        api.faturas.list(),
      ])
      setPacientes(p)
      setCirurgias(c)
      setFaturas(f)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('cirurgias', () => loadData())
  useRealtime('faturas', () => loadData())
  useRealtime('pacientes', () => loadData())

  const cirurgiasMes = useMemo(() => {
    const atual = new Date().getMonth()
    return cirurgias.filter((c) => new Date(c.data_cirurgia).getMonth() === atual).length
  }, [cirurgias])

  const receitaMensal = useMemo(() => {
    const atual = new Date().getMonth()
    return faturas
      .filter(
        (f) =>
          f.status === 'paga' &&
          f.data_pagamento &&
          new Date(f.data_pagamento).getMonth() === atual,
      )
      .reduce((acc, curr) => acc + curr.valor, 0)
  }, [faturas])

  const faturasPendentes = useMemo(
    () => faturas.filter((f) => f.status === 'pendente').length,
    [faturas],
  )

  const chartData = useMemo(() => {
    const statusCount = { agendada: 0, realizada: 0, cancelada: 0 }
    cirurgias.forEach((c) => {
      if (statusCount[c.status] !== undefined) statusCount[c.status]++
    })
    return [
      { name: 'Agendadas', total: statusCount.agendada },
      { name: 'Realizadas', total: statusCount.realizada },
      { name: 'Canceladas', total: statusCount.cancelada },
    ]
  }, [cirurgias])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{pacientes.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cirurgias do Mês</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{cirurgiasMes}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  receitaMensal,
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturas Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{faturasPendentes}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Status das Cirurgias</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ total: { label: 'Total', color: 'hsl(var(--primary))' } }}
              className="h-[300px]"
            >
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Próximas Cirurgias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cirurgias
                .filter((c) => c.status === 'agendada')
                .slice(0, 5)
                .map((cirurgia) => (
                  <div
                    key={cirurgia.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{cirurgia.expand?.paciente_id?.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Dr. {cirurgia.expand?.medico_id?.name}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      {format(new Date(cirurgia.data_cirurgia), 'dd/MM/yyyy')}
                    </div>
                  </div>
                ))}
              {cirurgias.filter((c) => c.status === 'agendada').length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma cirurgia agendada.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
