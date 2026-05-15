import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { getPagamentos, type Pagamento } from '@/services/pagamentos'
import { getContasPagar, type ContaPagar } from '@/services/contas_pagar'
import { getFaturas, type Fatura } from '@/services/faturas'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
const formatDt = (d?: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '-')

const chartConfig = {
  Receita: { label: 'Receita (R$)', color: 'hsl(var(--primary))' },
  Despesa: { label: 'Despesa (R$)', color: 'hsl(var(--destructive))' },
}

export function RelatoriosTab() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)

  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    setLoading(true)
    Promise.all([getPagamentos(), getContasPagar(), getFaturas()]).then(([p, c, f]) => {
      setPagamentos(p)
      setContas(c)
      setFaturas(f)
      setLoading(false)
    })
  }, [])

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  const currentPagamentos = useMemo(
    () => pagamentos.filter((p) => p.data_pagamento?.startsWith(monthStr)),
    [pagamentos, monthStr],
  )
  const currentContas = useMemo(
    () => contas.filter((c) => c.status === 'paga' && c.data_pagamento?.startsWith(monthStr)),
    [contas, monthStr],
  )

  const receitaTotal = currentPagamentos.reduce((sum, p) => sum + p.valor_pago, 0)
  const despesaTotal = currentContas.reduce((sum, c) => sum + (c.valor_pago || c.valor), 0)
  const saldo = receitaTotal - despesaTotal

  const inadimplenciaTotal = faturas
    .filter((f) => f.status === 'pendente' || f.status === 'vencida')
    .reduce((sum, f) => sum + (f.saldo_restante ?? f.valor), 0)

  const chartData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    let accR = 0,
      accD = 0
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const dStr = `${monthStr}-${String(d).padStart(2, '0')}`
      const r = currentPagamentos
        .filter((p) => p.data_pagamento?.startsWith(dStr))
        .reduce((s, p) => s + p.valor_pago, 0)
      const desp = currentContas
        .filter((c) => c.data_pagamento?.startsWith(dStr))
        .reduce((s, c) => s + (c.valor_pago || c.valor), 0)
      accR += r
      accD += desp
      return { day: String(d).padStart(2, '0'), Receita: accR, Despesa: accD }
    })
  }, [currentPagamentos, currentContas, monthStr, year, month])

  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  const years = [2024, 2025, 2026, 2027, 2028]

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <CalendarIcon className="text-muted-foreground h-5 w-5 hidden sm:block" />
        <h3 className="font-medium mr-4">Período de Referência:</h3>
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i} value={i.toString()}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatBRL(receitaTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatBRL(despesaTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${saldo >= 0 ? 'text-primary' : 'text-destructive'}`}
            >
              {formatBRL(saldo)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatBRL(inadimplenciaTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total de faturas em aberto</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crescimento do Mês</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickFormatter={(v) => `R$ ${v / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="Receita"
                  stroke="var(--color-Receita)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Despesa"
                  stroke="var(--color-Despesa)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="receitas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="receitas">Detalhes - Receitas</TabsTrigger>
          <TabsTrigger value="despesas">Detalhes - Despesas</TabsTrigger>
        </TabsList>
        <TabsContent value="receitas" className="mt-4 border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPagamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    Nenhuma receita no período
                  </TableCell>
                </TableRow>
              ) : (
                currentPagamentos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDt(p.data_pagamento)}</TableCell>
                    <TableCell className="font-medium">
                      {p.expand?.fatura_id?.expand?.paciente_id?.nome || 'N/A'}
                    </TableCell>
                    <TableCell className="capitalize">{p.metodo.replace('_', ' ')}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatBRL(p.valor_pago)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="despesas" className="mt-4 border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentContas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    Nenhuma despesa no período
                  </TableCell>
                </TableRow>
              ) : (
                currentContas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{formatDt(c.data_pagamento)}</TableCell>
                    <TableCell className="font-medium">{c.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {c.categoria.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-destructive">
                      {formatBRL(c.valor_pago || c.valor)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  )
}
