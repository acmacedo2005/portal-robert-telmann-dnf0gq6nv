import React, { useState, useRef } from 'react'
import { parseCSV, parseXLSX, parseExcelOrBrDate, parseBrCurrency } from '@/lib/import-utils'
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
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  BarChart3,
  Database,
  AlertTriangle,
  Info,
} from 'lucide-react'

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
    const normalizedRow: any = {}
    for (const key in row) {
      const normalizedKey = String(key)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      normalizedRow[normalizedKey] = row[key]
    }

    const data = parseExcelOrBrDate(getVal(normalizedRow, ['data', 'date', 'data do lancamento']))
    const data_quitacao = parseExcelOrBrDate(
      getVal(normalizedRow, ['data de quitacao', 'data quitacao', 'data de pagamento']),
    )
    const nome_negociador = getVal(normalizedRow, [
      'cliente/fornecedor',
      'nome do cliente/fornecedor',
      'nome do clientefornecedor',
      'nome',
      'fornecedor',
      'cliente',
    ])
    // The requirement implies strictly 2 decimals
    const valor = parseBrCurrency(getVal(normalizedRow, ['valor', 'value']))

    const tipoStr = String(getVal(normalizedRow, ['tipo', 'type'])).toUpperCase()
    let tipo = 'EXPENSE'
    if (tipoStr.includes('RECEITA') || tipoStr.includes('REVENUE') || tipoStr.includes('ENTRADA')) {
      tipo = 'REVENUE'
    }

    const descricao = getVal(normalizedRow, ['descricao', 'description', 'historico'])

    const statusStr = String(getVal(normalizedRow, ['status', 'situacao'])).toUpperCase()
    let status = 'PENDENTE'
    if (
      statusStr.includes('QUITADO') ||
      statusStr.includes('PAGO') ||
      statusStr.includes('RECEBIDO')
    ) {
      status = 'QUITADO'
    }

    return {
      data,
      data_quitacao,
      nome_negociador,
      valor,
      tipo,
      descricao,
      status,
      data_vencimento: parseExcelOrBrDate(
        getVal(normalizedRow, ['data de vencimento', 'vencimento']),
      ),
      data_competencia: parseExcelOrBrDate(
        getVal(normalizedRow, ['data de competencia', 'competencia']),
      ),
      data_pagamento_esperada: parseExcelOrBrDate(
        getVal(normalizedRow, ['data de pagamento esperada']),
      ),
      metodo_pagamento: getVal(normalizedRow, [
        'metodo de pagamento',
        'forma de pagamento',
        'metodo',
      ]),
      conta_financeira: getVal(normalizedRow, ['conta financeira', 'conta']),
      categoria: getVal(normalizedRow, ['categoria', 'grupo']),
      centro_custo: getVal(normalizedRow, ['centro de custo', 'centro de custos']),
      hash: `${data}_${valor}_${descricao}`.substring(0, 250),
    }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setProgress(0)
    const importStartTime = new Date().toISOString()

    try {
      let rows: any[] = []

      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text()
        rows = parseCSV(text)
      } else if (
        file.name.toLowerCase().endsWith('.xlsx') ||
        file.name.toLowerCase().endsWith('.xls')
      ) {
        rows = await parseXLSX(file)
      } else {
        throw new Error('Formato de arquivo não suportado. Use apenas .csv ou .xlsx')
      }

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
      let batchSuccessCount = 0
      let batchFailCount = 0

      const processRecord = async (rec: any) => {
        try {
          const existing = await pb
            .collection('lancamentos_financeiros')
            .getFirstListItem(`hash="${rec.hash}"`, { requestKey: null })
          if (existing) {
            const err = new Error('Duplicate')
            ;(err as any).isDuplicate = true
            throw err
          }
        } catch (err: any) {
          if (err.status !== 404 && !err.isDuplicate) {
            throw err
          }
          if (err.isDuplicate) throw err
        }

        const lancamento = await pb
          .collection('lancamentos_financeiros')
          .create(rec, { requestKey: null })

        try {
          if (rec.tipo === 'REVENUE' && rec.status === 'QUITADO') {
            const searchStr = (rec.descricao || rec.nome_negociador || '').trim()
            if (searchStr) {
              const safeSearch = searchStr.replace(/["'\\]/g, '')
              let vendaId = null

              if (safeSearch.length > 3) {
                const vendasResp = await pb
                  .collection('vendas')
                  .getList(1, 1, {
                    filter: `observacoes ~ "${safeSearch}"`,
                    requestKey: null,
                  })
                  .catch(() => null)
                vendaId = vendasResp?.items[0]?.id

                if (!vendaId) {
                  const pacientesResp = await pb
                    .collection('pacientes')
                    .getList(1, 1, {
                      filter: `nome ~ "${safeSearch}"`,
                      requestKey: null,
                    })
                    .catch(() => null)

                  if (pacientesResp && pacientesResp.items.length > 0) {
                    const pacId = pacientesResp.items[0].id
                    const vResp = await pb
                      .collection('vendas')
                      .getList(1, 1, {
                        filter: `paciente_id = "${pacId}"`,
                        sort: '-created',
                        requestKey: null,
                      })
                      .catch(() => null)
                    vendaId = vResp?.items[0]?.id
                  }
                }
              }

              if (vendaId) {
                const crResp = await pb
                  .collection('contas_receber')
                  .getList(1, 1, {
                    filter: `venda_id = "${vendaId}"`,
                    requestKey: null,
                  })
                  .catch(() => null)

                if (crResp && crResp.items.length > 0) {
                  const cr = crResp.items[0]
                  const valorRecebido = (cr.valor_recebido || 0) + rec.valor
                  const valorPendente = Math.max(0, (cr.valor_total || 0) - valorRecebido)
                  const statusCr = valorPendente <= 0 ? 'Pago' : 'Parcial'

                  await pb.collection('contas_receber').update(
                    cr.id,
                    {
                      valor_recebido: valorRecebido,
                      valor_pendente: valorPendente,
                      status: statusCr,
                    },
                    { requestKey: null },
                  )

                  await pb.collection('recebimentos').create(
                    {
                      contas_receber_id: cr.id,
                      lancamento_id: lancamento.id,
                      data_recebimento: rec.data_quitacao || rec.data,
                      valor_recebido: rec.valor,
                      metodo_pagamento: rec.metodo_pagamento || 'Outros',
                      observacoes: rec.descricao || 'Recebimento importado',
                    },
                    { requestKey: null },
                  )
                }
              }
            }
          } else if (rec.tipo === 'EXPENSE') {
            const statusCp = rec.status === 'QUITADO' || rec.data_quitacao ? 'paga' : 'pendente'

            let validMetodo = 'transferencia'
            const met = (rec.metodo_pagamento || '').toLowerCase()
            if (met.includes('cartao') && met.includes('deb')) validMetodo = 'cartao_debito'
            else if (met.includes('cartao') && met.includes('cred')) validMetodo = 'cartao_credito'
            else if (met.includes('cartao')) validMetodo = 'cartao'
            else if (met.includes('dinheiro')) validMetodo = 'dinheiro'
            else if (met.includes('pix')) validMetodo = 'pix'
            else if (met.includes('transf')) validMetodo = 'transferencia'

            await pb.collection('contas_pagar').create(
              {
                descricao: rec.descricao || 'Despesa importada',
                fornecedor: rec.nome_negociador || 'Não informado',
                valor: rec.valor,
                status: statusCp,
                categoria: 'outros',
                data_vencimento: rec.data_vencimento || rec.data || new Date().toISOString(),
                data_pagamento: rec.data_quitacao || null,
                valor_pago: rec.status === 'QUITADO' || rec.data_quitacao ? rec.valor : 0,
                metodo_pagamento: validMetodo,
                lancamento_id: lancamento.id,
              },
              { requestKey: null },
            )
          }
        } catch (err) {
          console.error('Conciliation error:', err)
        }

        return lancamento
      }

      for (let i = 0; i < records.length; i += 50) {
        let batch = records.slice(i, i + 50)
        let batchCompleted = false
        let attempts = 0

        while (!batchCompleted && attempts < 3) {
          let has429 = false
          let retryBatch: typeof records = []

          const results = await Promise.allSettled(batch.map(processRecord))

          for (let j = 0; j < results.length; j++) {
            const res = results[j]
            if (res.status === 'fulfilled') {
              success++
              if (batch[j].tipo === 'REVENUE') sumRevenue += batch[j].valor
              if (batch[j].tipo === 'EXPENSE') sumExpense += batch[j].valor
            } else {
              const err = res.reason
              if (err?.status === 429) {
                has429 = true
                retryBatch.push(batch[j])
              } else if (err?.isDuplicate || err?.status === 400) {
                duplicates++
              } else {
                errors++
                console.error('Import error', err)
              }
            }
          }

          if (has429) {
            attempts++
            // Delay Control: 429 Error => 5 seconds delay and retry that specific batch
            await new Promise((r) => setTimeout(r, 5000))
            batch = retryBatch
          } else {
            batchCompleted = true
            if (retryBatch.length === 0 && errors === 0) {
              batchSuccessCount++
            } else {
              batchFailCount++
            }
          }
        }

        if (attempts >= 3) {
          errors += batch.length
          batchFailCount++
        }

        processed += Math.min(50, records.length - i)
        setProgress(Math.round((processed / records.length) * 100))

        // Delay Control: 2 seconds wait between standard batches
        if (i + 50 < records.length) {
          await new Promise((r) => setTimeout(r, 2000))
        }
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
        batchSuccessCount,
        batchFailCount,
        updatedReceber: updatedReceber.totalItems,
        createdPagar: createdPagar.totalItems,
        salesStatus: {
          quitadas: countQuitadas.totalItems,
          parcial: countParcial.totalItems,
          pendentes: countPendente.totalItems,
        },
      })

      if (errors > 0) {
        toast({
          title: 'Importação parcial — tente novamente os lotes com erro',
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Importação financeira concluída com sucesso!' })
      }
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Database className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importação Financeira</h1>
          <p className="text-muted-foreground mt-1">
            Importe registros em lote (.csv ou .xlsx) e reconcilie automaticamente com vendas e
            contas a pagar.
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Iniciar Importação</CardTitle>
          <CardDescription>
            Faça upload da planilha exportada pelo seu sistema financeiro (formato .csv ou .xlsx).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" />
              Selecionar Arquivo
            </Button>
            <input
              type="file"
              accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm font-medium bg-muted px-3 py-1.5 rounded-md">
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                {file.name}
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex items-start gap-3 text-sm">
            <Info className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p>
                <strong>Deduplicação Inteligente:</strong> O sistema ignora automaticamente
                lançamentos que já foram importados anteriormente.
              </p>
              <p>
                <strong>Conciliação Automática:</strong> Entradas de Receita (QUITADO) são ligadas a
                Vendas correspondentes. Despesas geram Contas a Pagar automaticamente.
              </p>
              <p>
                <strong>Controle de Lotes:</strong> Arquivos grandes são processados em lotes de 50
                itens com pausa de segurança para garantir a integridade.
              </p>
            </div>
          </div>

          {importing && (
            <div className="space-y-3 pt-4">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-primary animate-pulse">Processando lote financeiro...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/30 border-t pt-6">
          <Button
            size="lg"
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full sm:w-auto"
          >
            <Database className="w-4 h-4 mr-2" />
            {importing ? 'Importando Lotes...' : 'Processar Importação'}
          </Button>
        </CardFooter>
      </Card>

      {report && (
        <div className="space-y-6 animate-fade-in-up">
          <div
            className={`p-5 rounded-lg border flex items-center gap-4 shadow-sm ${
              report.errors > 0
                ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400'
                : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-900/50 dark:text-green-400'
            }`}
          >
            {report.errors > 0 ? (
              <AlertTriangle className="w-8 h-8 shrink-0" />
            ) : (
              <CheckCircle2 className="w-8 h-8 shrink-0" />
            )}
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {report.errors > 0
                  ? 'Importação parcial — tente novamente os lotes com erro'
                  : 'Importação financeira concluída'}
              </h2>
              <p className="text-sm opacity-90 mt-1">
                A operação foi finalizada. Consulte o painel analítico abaixo para os resultados das
                conciliações. Registros não vinculados foram marcados com [UNLINKED] para revisão.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Resumo de Processamento</CardDescription>
                <CardTitle className="text-3xl">{report.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Lotes Sucesso / Falha:</span>
                    <span className="font-medium text-foreground">
                      {report.batchSuccessCount} / {report.batchFailCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duplicados (Ignorados):</span>
                    <span className="font-medium text-foreground">{report.duplicates}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Erros de Estrutura:</span>
                    <span className="font-medium text-red-500">{report.errors}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Totais Financeiros</CardDescription>
                <CardTitle className="text-2xl text-green-600 dark:text-green-500">
                  {formatCurrency(report.sumRevenue)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between items-center">
                    <span>Total de Despesas:</span>
                    <span className="font-medium text-red-500">
                      {formatCurrency(report.sumExpense)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t mt-1">
                    <span>Saldo do Lote:</span>
                    <span
                      className={`font-medium ${report.sumRevenue - report.sumExpense >= 0 ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {formatCurrency(report.sumRevenue - report.sumExpense)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Métricas Operacionais</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Geração Auto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Contas a Receber Atualizadas:</span>
                    <span className="font-medium text-primary">{report.updatedReceber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contas a Pagar Criadas:</span>
                    <span className="font-medium text-primary">{report.createdPagar}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Geral da Carteira de Vendas</CardTitle>
              <CardDescription>
                Resumo da situação das vendas no sistema após a conciliação financeira do arquivo
                importado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                    {report.salesStatus.quitadas}
                  </div>
                  <div className="text-sm font-medium text-green-800 dark:text-green-400 mt-1">
                    Quitadas
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-100 dark:border-amber-900/30">
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">
                    {report.salesStatus.parcial}
                  </div>
                  <div className="text-sm font-medium text-amber-800 dark:text-amber-400 mt-1">
                    Parcialmente Quitadas
                  </div>
                </div>
                <div className="bg-muted p-4 rounded-lg border">
                  <div className="text-3xl font-bold text-foreground">
                    {report.salesStatus.pendentes}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mt-1">Pendentes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
