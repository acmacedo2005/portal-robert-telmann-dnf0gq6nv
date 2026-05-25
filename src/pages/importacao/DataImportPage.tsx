import React, { useState, useRef } from 'react'
import { parseCSV, parseBrDate, parseBrCurrency } from '@/lib/import-utils'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileSpreadsheet, CheckCircle2, BarChart3, Database } from 'lucide-react'

export default function DataImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setReport(null)
      setProgress(0)
    }
  }

  const getVal = (row: any, keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined) return row[k]
    }
    return ''
  }

  const mapRow = (row: any) => {
    const data = parseBrDate(getVal(row, ['data', 'date', 'data do lancamento']))
    const data_quitacao = parseBrDate(getVal(row, ['data de quitacao', 'data quitacao']))
    const nome_negociador = getVal(row, [
      'cliente/fornecedor',
      'nome do cliente/fornecedor',
      'nome do clientefornecedor',
      'nome',
    ])
    const valor = parseBrCurrency(getVal(row, ['valor', 'value']))
    const tipoStr = String(getVal(row, ['tipo', 'type'])).toUpperCase()
    let tipo = 'EXPENSE'
    if (tipoStr.includes('RECEITA') || tipoStr.includes('REVENUE')) tipo = 'REVENUE'
    const descricao = getVal(row, ['descricao', 'description'])
    const statusStr = String(getVal(row, ['status'])).toUpperCase()
    let status = 'PENDENTE'
    if (
      statusStr.includes('QUITADO') ||
      statusStr.includes('PAGO') ||
      statusStr.includes('RECEBIDO')
    )
      status = 'QUITADO'

    return {
      data,
      data_quitacao,
      nome_negociador,
      valor,
      tipo,
      descricao,
      status,
      data_vencimento: parseBrDate(getVal(row, ['data de vencimento', 'vencimento'])),
      data_competencia: parseBrDate(getVal(row, ['data de competencia', 'competencia'])),
      data_pagamento_esperada: parseBrDate(getVal(row, ['data de pagamento esperada'])),
      metodo_pagamento: getVal(row, ['metodo de pagamento', 'forma de pagamento']),
      conta_financeira: getVal(row, ['conta financeira', 'conta']),
      categoria: getVal(row, ['categoria']),
      centro_custo: getVal(row, ['centro de custo', 'centro de custos']),
      hash: `${data}_${valor}_${descricao}`.substring(0, 250),
    }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setProgress(0)
    const importStartTime = new Date().toISOString()

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      const records = rows.map(mapRow).filter((r) => r.data && r.valor > 0)

      if (records.length === 0) {
        toast({ title: 'Nenhum registro válido encontrado', variant: 'destructive' })
        setImporting(false)
        return
      }

      let processed = 0
      let success = 0
      let duplicates = 0
      let errors = 0
      let sumRevenue = 0
      let sumExpense = 0

      for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50)

        await Promise.all(
          batch.map(async (rec) => {
            let attempts = 0
            while (attempts < 3) {
              try {
                await pb.collection('lancamentos_financeiros').create(rec, { requestKey: null })
                success++
                if (rec.tipo === 'REVENUE') sumRevenue += rec.valor
                if (rec.tipo === 'EXPENSE') sumExpense += rec.valor
                break
              } catch (e: any) {
                if (e.status === 429) {
                  attempts++
                  await new Promise((r) => setTimeout(r, 5000))
                } else if (e.status === 400) {
                  duplicates++
                  break
                } else {
                  errors++
                  break
                }
              }
            }
          }),
        )

        processed += batch.length
        setProgress(Math.round((processed / records.length) * 100))
        await new Promise((r) => setTimeout(r, 2000))
      }

      const updatedReceber = await pb
        .collection('contas_receber')
        .getList(1, 1, { filter: `updated >= "${importStartTime}"` })
      const createdPagar = await pb
        .collection('contas_pagar')
        .getList(1, 1, { filter: `created >= "${importStartTime}"` })

      const countQuitadas = await pb
        .collection('contas_receber')
        .getList(1, 1, { filter: `status = 'Pago'` })
      const countParcial = await pb
        .collection('contas_receber')
        .getList(1, 1, { filter: `status = 'Parcial'` })
      const countPendente = await pb
        .collection('contas_receber')
        .getList(1, 1, { filter: `status = 'Pendente'` })

      setReport({
        total: records.length,
        success,
        duplicates,
        errors,
        sumRevenue,
        sumExpense,
        updatedReceber: updatedReceber.totalItems,
        createdPagar: createdPagar.totalItems,
        salesStatus: {
          quitadas: countQuitadas.totalItems,
          parcial: countParcial.totalItems,
          pendentes: countPendente.totalItems,
        },
      })

      toast({ title: 'Importação financeira concluída com sucesso!' })
    } catch (error) {
      toast({
        title: 'Erro ao processar arquivo',
        description: String(error),
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Database className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importação Financeira</h1>
          <p className="text-muted-foreground">
            Importe seus lançamentos financeiros em lotes e reconcilie automaticamente com vendas e
            contas a pagar.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova Importação</CardTitle>
          <CardDescription>
            Selecione uma planilha (formato CSV) exportada do seu sistema financeiro (ex: Conta
            Azul).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="w-4 h-4 mr-2" />
              Selecionar Arquivo
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {file && <span className="text-sm font-medium">{file.name}</span>}
          </div>

          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processando lançamentos em lotes...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleImport} disabled={!file || importing} className="w-full sm:w-auto">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {importing ? 'Importando...' : 'Iniciar Importação'}
          </Button>
        </CardFooter>
      </Card>

      {report && (
        <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <CardTitle>Relatório de Importação</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Resumo do Processamento
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Lançamentos Identificados:</span>
                  <span className="font-medium">{report.total}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Importados com Sucesso:</span>
                  <span className="font-medium text-green-600">{report.success}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Duplicados (Ignorados):</span>
                  <span className="font-medium text-amber-600">{report.duplicates}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Erros:</span>
                  <span className="font-medium text-red-600">{report.errors}</span>
                </li>
              </ul>

              <h3 className="font-semibold pt-4">Valores Financeiros</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Total de Receitas:</span>
                  <span className="font-medium text-green-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      report.sumRevenue,
                    )}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Total de Despesas:</span>
                  <span className="font-medium text-red-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      report.sumExpense,
                    )}
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Reconciliação Automática</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Contas a Receber Atualizadas:</span>
                  <span className="font-medium">{report.updatedReceber}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Contas a Pagar Criadas:</span>
                  <span className="font-medium">{report.createdPagar}</span>
                </li>
              </ul>

              <h3 className="font-semibold pt-4">Status Geral de Vendas</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Quitadas:</span>
                  <span className="font-medium text-green-600">{report.salesStatus.quitadas}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Parcialmente Quitadas:</span>
                  <span className="font-medium text-amber-600">{report.salesStatus.parcial}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Pendentes:</span>
                  <span className="font-medium">{report.salesStatus.pendentes}</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
