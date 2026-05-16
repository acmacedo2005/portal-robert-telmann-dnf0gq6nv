import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { DollarSign } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface FluxoCaixaChartProps {
  data: any[]
  loading: boolean
  formatCurrency: (val: number) => string
}

const chartConfig = {
  Receitas: { label: 'Receitas', color: '#2563eb' },
  Despesas: { label: 'Despesas', color: '#dc2626' },
}

export function FluxoCaixaChart({ data, loading, formatCurrency }: FluxoCaixaChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo Acumulado</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="w-full h-[300px]" />
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <DollarSign size={48} className="mb-4 opacity-20" />
            <p>Nenhum dado para este mês</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" />
              <YAxis tickFormatter={(value) => `R$ ${value}`} width={80} />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload
                    return (
                      <div className="bg-background border p-3 rounded-lg shadow-lg">
                        <p className="font-bold mb-2">{d.dataCompleta}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <span className="text-blue-600">Receita Dia:</span>
                          <span className="text-blue-600 font-medium text-right">
                            {formatCurrency(d.receitaDia)}
                          </span>
                          <span className="text-blue-700">Acumulado:</span>
                          <span className="text-blue-700 font-bold text-right">
                            {formatCurrency(d.Receitas)}
                          </span>
                          <span className="text-red-600 mt-2">Despesa Dia:</span>
                          <span className="text-red-600 font-medium text-right mt-2">
                            {formatCurrency(d.despesaDia)}
                          </span>
                          <span className="text-red-700">Acumulado:</span>
                          <span className="text-red-700 font-bold text-right">
                            {formatCurrency(d.Despesas)}
                          </span>
                          <span className="font-medium mt-2">Saldo do Dia:</span>
                          <span
                            className={cn(
                              'font-bold text-right mt-2',
                              d.Saldo >= 0 ? 'text-green-600' : 'text-red-600',
                            )}
                          >
                            {formatCurrency(d.Saldo)}
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="Receitas"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Despesas"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
