import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDownIcon, ArrowUpIcon, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FluxoCaixaSummaryProps {
  totalReceitas: number
  totalDespesas: number
  saldoMes: number
  totalInadimplencia: number
  formatCurrency: (val: number) => string
}

export function FluxoCaixaSummary({
  totalReceitas,
  totalDespesas,
  saldoMes,
  totalInadimplencia,
  formatCurrency,
}: FluxoCaixaSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-blue-100 dark:border-blue-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Receita Total
          </CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {formatCurrency(totalReceitas)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-100 dark:border-red-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
            Despesa Total
          </CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">
            {formatCurrency(totalDespesas)}
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          saldoMes >= 0
            ? 'border-green-100 dark:border-green-900'
            : 'border-red-100 dark:border-red-900',
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle
            className={cn(
              'text-sm font-medium',
              saldoMes >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            Saldo do Mês
          </CardTitle>
          {saldoMes >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'text-2xl font-bold',
              saldoMes >= 0
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300',
            )}
          >
            {formatCurrency(saldoMes)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-100 dark:border-orange-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
            Inadimplência
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {formatCurrency(totalInadimplencia)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Do mês selecionado</p>
        </CardContent>
      </Card>
    </div>
  )
}
