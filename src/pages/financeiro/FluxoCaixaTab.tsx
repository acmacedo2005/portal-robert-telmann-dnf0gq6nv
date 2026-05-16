import { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

import { FluxoCaixaSummary } from './FluxoCaixaSummary'
import { FluxoCaixaChart } from './FluxoCaixaChart'
import { FluxoCaixaDetails } from './FluxoCaixaDetails'

export function FluxoCaixaTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { toast } = useToast()

  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [inadimplentes, setInadimplentes] = useState<any[]>([])
  const [despesas, setDespesas] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    setError(false)
    try {
      const start = format(startOfMonth(selectedDate), 'yyyy-MM-dd 00:00:00')
      const end = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59')

      const [resPagamentos, resInad, resDespesas, resCategorias] = await Promise.all([
        pb.collection('pagamentos').getFullList({
          filter: `data_pagamento >= "${start}" && data_pagamento <= "${end}"`,
          expand: 'fatura_id.paciente_id',
        }),
        pb.collection('faturas').getFullList({
          filter: `(status = "pendente" || status = "vencida" || status = "parcial") && data_vencimento >= "${start}" && data_vencimento <= "${end}"`,
          expand: 'paciente_id',
        }),
        pb.collection('contas_pagar').getFullList({
          filter: `status = "paga" && data_pagamento >= "${start}" && data_pagamento <= "${end}"`,
          expand: 'categoria_id',
        }),
        pb.collection('categorias_financeiras').getFullList(),
      ])

      setPagamentos(resPagamentos)
      setInadimplentes(resInad)
      setDespesas(resDespesas)
      setCategorias(resCategorias)

      toast({
        title: 'Dados atualizados',
        description: `Fluxo de caixa carregado para ${format(selectedDate, 'MMMM/yyyy', { locale: ptBR })}.`,
      })
    } catch (err) {
      console.error(err)
      setError(true)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar os dados financeiros.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  const totalReceitas = useMemo(
    () => pagamentos.reduce((acc, p) => acc + (p.valor_pago || 0), 0),
    [pagamentos],
  )
  const totalDespesas = useMemo(
    () => despesas.reduce((acc, d) => acc + (d.valor_pago || d.valor || 0), 0),
    [despesas],
  )
  const saldoMes = totalReceitas - totalDespesas
  const totalInadimplencia = useMemo(
    () =>
      inadimplentes.reduce((acc, f) => {
        const isOverdue = f.data_vencimento?.slice(0, 10) < new Date().toISOString().slice(0, 10)
        if (!isOverdue) return acc
        return acc + (f.saldo_restante ?? f.valor ?? 0)
      }, 0),
    [inadimplentes],
  )

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate),
    })
    let accReceitas = 0
    let accDespesas = 0

    return days.map((d) => {
      const dayStr = format(d, 'yyyy-MM-dd')
      const receitasDia = pagamentos
        .filter((p) => p.data_pagamento?.startsWith(dayStr))
        .reduce((sum, p) => sum + (p.valor_pago || 0), 0)
      const despesasDia = despesas
        .filter((d) => d.data_pagamento?.startsWith(dayStr))
        .reduce((sum, d) => sum + (d.valor_pago || d.valor || 0), 0)

      accReceitas += receitasDia
      accDespesas += despesasDia

      return {
        dia: format(d, 'dd'),
        dataCompleta: format(d, 'dd/MM/yyyy'),
        receitaDia: receitasDia,
        despesaDia: despesasDia,
        Receitas: accReceitas,
        Despesas: accDespesas,
        Saldo: accReceitas - accDespesas,
      }
    })
  }, [pagamentos, despesas, selectedDate])

  const renderMonthYearSelector = () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date()
      d.setMonth(i)
      return { value: i.toString(), label: format(d, 'MMMM', { locale: ptBR }) }
    })
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString())

    return (
      <div className="flex gap-4 items-center">
        <Select
          value={selectedDate.getMonth().toString()}
          onValueChange={(v) => {
            const newDate = new Date(selectedDate)
            newDate.setMonth(parseInt(v))
            setSelectedDate(newDate)
          }}
        >
          <SelectTrigger className="w-[150px] capitalize">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value} className="capitalize">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedDate.getFullYear().toString()}
          onValueChange={(v) => {
            const newDate = new Date(selectedDate)
            newDate.setFullYear(parseInt(v))
            setSelectedDate(newDate)
          }}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>
        {renderMonthYearSelector()}
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span>Ocorreu um erro ao carregar os dados.</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            Tentar Novamente
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <>
          <FluxoCaixaSummary
            totalReceitas={totalReceitas}
            totalDespesas={totalDespesas}
            saldoMes={saldoMes}
            totalInadimplencia={totalInadimplencia}
            formatCurrency={formatCurrency}
          />
          <FluxoCaixaChart data={chartData} loading={loading} formatCurrency={formatCurrency} />
          <FluxoCaixaDetails
            pagamentos={pagamentos}
            despesas={despesas}
            categorias={categorias}
            formatCurrency={formatCurrency}
          />
        </>
      )}
    </div>
  )
}
