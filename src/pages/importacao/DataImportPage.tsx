import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Database,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Info,
  ChevronDown,
  Download,
  TrendingDown,
} from 'lucide-react'

import pb from '@/lib/pocketbase/client'
import {
  parseCSV,
  parseBrCurrency,
  parseBrDate,
  parseExcelOrBrDate,
  normName,
  normPhone,
  getField,
} from '@/lib/import-utils'

export default function DataImportPage() {
  const { toast } = useToast()
  const [pessoasFile, setPessoasFile] = useState<File | null>(null)
  const [vendasFile, setVendasFile] = useState<File | null>(null)
  const [financeiroFile, setFinanceiroFile] = useState<File | null>(null)
  const [fluxoFile, setFluxoFile] = useState<File | null>(null)
  const [acompanhamentoFile, setAcompanhamentoFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    pacientes: number
    vendas: number
    receitas: number
    despesas: number
    fluxo: number
    acompanhamento: {
      registros: number
      vendedores: Record<string, number>
      aVencer: number
      vencido: number
    }
    erros: string[]
  } | null>(null)

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const handleImport = async () => {
    if (!pessoasFile && !vendasFile && !financeiroFile && !fluxoFile && !acompanhamentoFile) {
      toast({
        title: 'Aviso',
        description: 'Selecione pelo menos um arquivo para importar.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setResults(null)

    const logs: string[] = []
    let pacientesImportados = 0
    let vendasImportadas = 0
    let receitasGeradas = 0
    let despesasGeradas = 0
    let fluxoImportados = 0
    const acompanhamentoRes = {
      registros: 0,
      vendedores: {} as Record<string, number>,
      aVencer: 0,
      vencido: 0,
    }

    try {
      // 1. Fetch existing patients to build lookup map
      const existingPacientes = await pb.collection('pacientes').getFullList({ requestKey: null })
      const patientMap = new Map<string, string>()
      for (const p of existingPacientes) {
        const key = `${normName(p.nome)}|${normPhone(p.telefone)}`
        patientMap.set(key, p.id)
      }

      const findPatient = (row: any) => {
        const nomeRaw = row.nome_cliente || row.nome || row.cliente || ''
        const telRaw = row.telefone_cliente || row.telefone || ''
        const key = `${normName(nomeRaw)}|${normPhone(telRaw)}`

        if (patientMap.has(key)) return patientMap.get(key)

        if (normName(nomeRaw)) {
          for (const [k, v] of patientMap.entries()) {
            if (k.startsWith(normName(nomeRaw) + '|')) {
              return v
            }
          }
        }
        return null
      }

      // 2. Import Pessoas
      if (pessoasFile) {
        const text = await readFile(pessoasFile)
        const data = parseCSV(text)

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const nome = row.nome || getField(row, ['nome'])
          const telefone = row.telefone || getField(row, ['telefone'])
          if (!nome) {
            logs.push(`Linha ${i + 2} (Pessoas): Paciente ignorado - Nome não fornecido.`)
            continue
          }

          const key = `${normName(nome)}|${normPhone(telefone)}`
          if (!patientMap.has(key)) {
            try {
              const novo = await pb.collection('pacientes').create({
                nome: nome,
                telefone: telefone,
                email: row.email || '',
                endereco: row.endereco || row.rua || '',
                numero: row.numero || '',
                complemento: row.complemento || '',
                bairro: row.bairro || '',
                cidade: row.cidade || '',
                estado: row.estado || '',
                cep: row.cep || '',
                data_nascimento: parseBrDate(row.data_nascimento || row.nascimento) || null,
                genero: row.genero || '',
              })
              patientMap.set(key, novo.id)
              pacientesImportados++
            } catch (err: any) {
              logs.push(
                `Linha ${i + 2} (Pessoas): Erro ao importar paciente ${nome} - ${err.message}`,
              )
            }
          }
        }
      }

      // 3. Import Vendas
      if (vendasFile) {
        const text = await readFile(vendasFile)
        const data = parseCSV(text)

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const pid = findPatient(row)
          if (!pid) {
            logs.push(
              `Linha ${i + 2} (Vendas): Paciente não encontrado (${row.nome_cliente || 'Desconhecido'})`,
            )
            continue
          }

          try {
            let status = (row.status || '').toLowerCase()
            if (!['pendente', 'paga', 'parcial'].includes(status)) status = 'pendente'

            const valorTotal = parseBrCurrency(row.valor_total || row.valor)
            const entradaPaga = parseBrCurrency(row.entrada_paga)

            await pb.collection('vendas').create({
              paciente_id: pid,
              tipo: 'tratamento',
              valor_total: valorTotal,
              valor_final: valorTotal,
              entrada_paga: entradaPaga,
              status: status,
              data_venda:
                parseBrDate(row.data_proposta || row.data_venda || row.data) ||
                new Date().toISOString(),
              observacoes: row.observacoes || row.id_proposta || '',
            })
            vendasImportadas++
          } catch (err: any) {
            logs.push(`Linha ${i + 2} (Vendas): Erro ao importar venda - ${err.message}`)
          }
        }
      }

      // 4. Import Financeiro
      if (financeiroFile) {
        const text = await readFile(financeiroFile)
        const data = parseCSV(text)

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const tipo = (row.tipo || '').toLowerCase()
          const valor = parseBrCurrency(row.valor)
          const dtVencimento = parseBrDate(row.data_vencimento) || new Date().toISOString()
          const dtPagamento = parseBrDate(row.data_pagamento)

          if (tipo === 'receita') {
            const pid = findPatient(row)
            if (!pid) {
              logs.push(`Linha ${i + 2} (Financeiro): Receita ignorada - Paciente não encontrado`)
              continue
            }

            try {
              let status = (row.status || '').toLowerCase()
              if (!['pendente', 'vencida', 'paga', 'parcial'].includes(status)) status = 'pendente'

              await pb.collection('faturas').create({
                paciente_id: pid,
                valor: valor,
                data_vencimento: dtVencimento,
                data_pagamento: dtPagamento || null,
                status: status,
                observacoes: row.descricao || row.observacoes || '',
              })
              receitasGeradas++
            } catch (err: any) {
              logs.push(`Linha ${i + 2} (Financeiro): Erro ao importar receita - ${err.message}`)
            }
          } else if (tipo === 'despesa') {
            try {
              let status = (row.status || '').toLowerCase()
              if (!['pendente', 'vencida', 'paga'].includes(status)) status = 'pendente'

              let categoria = (row.categoria || '').toLowerCase()
              if (!categoria) categoria = 'outros'

              await pb.collection('contas_pagar').create({
                descricao: row.descricao || 'Despesa Importada',
                fornecedor: row.nome_cliente || row.fornecedor || 'Desconhecido',
                valor: valor,
                status: status,
                categoria: categoria,
                data_vencimento: dtVencimento,
                data_pagamento: dtPagamento || null,
                observacoes: row.observacoes || '',
              })
              despesasGeradas++
            } catch (err: any) {
              logs.push(`Linha ${i + 2} (Financeiro): Erro ao importar despesa - ${err.message}`)
            }
          }
        }
      }

      // 5. Import Fluxo de Pagamentos
      if (fluxoFile) {
        const text = await readFile(fluxoFile)
        const data = parseCSV(text)

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const vencimentoRaw = row.vencimento || row.data_vencimento
          const vencimento = parseBrDate(vencimentoRaw)
          const valor = parseBrCurrency(row.valor)
          const fornecedor = row.fornecedor || row.nome || row.descricao || ''

          if (!vencimento || !fornecedor) {
            logs.push(
              `Linha ${i + 2} (Fluxo Pagamentos): Ignorada - Vencimento ou Fornecedor ausentes.`,
            )
            continue
          }

          try {
            let status = (row.status || '').toLowerCase()
            if (!['pendente', 'pago', 'vencido', 'cancelado'].includes(status)) status = 'pendente'

            await pb.collection('fluxo_pagamentos').create({
              vencimento: vencimento,
              valor: valor,
              fornecedor: fornecedor,
              observacoes: row.observacoes || '',
              status: status,
              data_pagto: parseBrDate(row.data_pagto || row.data_pagamento) || null,
            })
            fluxoImportados++
          } catch (err: any) {
            logs.push(`Linha ${i + 2} (Fluxo Pagamentos): Erro - ${err.message}`)
          }
        }
      }

      // 6. Import Acompanhamento
      if (acompanhamentoFile) {
        const text = await readFile(acompanhamentoFile)
        const data = parseCSV(text)

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const mesStr = row['mes'] || row['mês'] || row['data'] || ''
          const mes = parseExcelOrBrDate(mesStr)
          const vendedor = row['vendedor'] || ''
          const nomeCliente =
            row['nome do cliente ou fornecedor'] || row['nome'] || row['cliente'] || ''

          if (!vendedor || !nomeCliente) {
            logs.push(
              `Linha ${i + 2} (Acompanhamento): Ignorada - Vendedor ou Nome do Cliente ausentes.`,
            )
            continue
          }

          const valor = parseBrCurrency(row['valor'])
          const valorBaixado = parseBrCurrency(row['valor baixado (bruto)'] || row['valor baixado'])
          const valorVencer = parseBrCurrency(row['valor a vencer'] || row['valor a receber'])
          const valorVencido = parseBrCurrency(row['valor vencido'])
          const valorPerda = parseBrCurrency(row['valor da perda'])

          try {
            await pb.collection('acompanhamento_vendas').create({
              mes: mes || new Date().toISOString(),
              vendedor: vendedor,
              nome_cliente: nomeCliente,
              valor: valor,
              valor_baixado: valorBaixado,
              valor_a_vencer: valorVencer,
              valor_vencido: valorVencido,
              valor_perda: valorPerda,
            })

            acompanhamentoRes.registros++
            acompanhamentoRes.aVencer += valorVencer
            acompanhamentoRes.vencido += valorVencido
            acompanhamentoRes.vendedores[vendedor] =
              (acompanhamentoRes.vendedores[vendedor] || 0) + valor
          } catch (err: any) {
            logs.push(`Linha ${i + 2} (Acompanhamento): Erro - ${err.message}`)
          }
        }
      }

      setResults({
        pacientes: pacientesImportados,
        vendas: vendasImportadas,
        receitas: receitasGeradas,
        despesas: despesasGeradas,
        fluxo: fluxoImportados,
        acompanhamento: acompanhamentoRes,
        erros: logs,
      })

      toast({ title: 'Sucesso', description: 'Processo de importação concluído com sucesso.' })
    } catch (error: any) {
      toast({
        title: 'Erro de Processamento',
        description: error.message || 'Ocorreu um erro durante a importação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setPessoasFile(null)
      setVendasFile(null)
      setFinanceiroFile(null)
      setFluxoFile(null)
      setAcompanhamentoFile(null)
      const inputs = document.querySelectorAll('input[type="file"]')
      inputs.forEach((input) => {
        ;(input as HTMLInputElement).value = ''
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Dashboard de Importação</h1>
            <p className="text-muted-foreground mt-1">
              Carregue arquivos CSV para migrar dados legados para o sistema.
            </p>
          </div>
        </div>
        <Button variant="outline" asChild className="hidden md:flex">
          <Link to="/relatorios/fluxo-pagamentos">
            <TrendingDown className="w-4 h-4 mr-2" />
            Relatório de Fluxo de Pagamentos
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" /> 1. Pessoas
            </CardTitle>
            <CardDescription>Upload do arquivo pessoas.csv</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="pessoas">Arquivo CSV</Label>
                <Input
                  id="pessoas"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setPessoasFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                  <Info className="w-4 h-4 mr-1" /> Colunas Esperadas{' '}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md font-mono leading-relaxed">
                  nome, telefone, email, endereco, numero, complemento, bairro, cidade, estado, cep,
                  data_nascimento, genero
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> 2. Vendas
            </CardTitle>
            <CardDescription>Upload do arquivo propostas_comerciais.csv</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="vendas">Arquivo CSV</Label>
                <Input
                  id="vendas"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setVendasFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                  <Info className="w-4 h-4 mr-1" /> Colunas Esperadas{' '}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md font-mono leading-relaxed">
                  id_proposta, nome_cliente, telefone_cliente, data_proposta, valor_total,
                  entrada_paga, forma_pagamento, status, observacoes
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-600" /> 3. Financeiro
            </CardTitle>
            <CardDescription>Upload do arquivo financeiro.csv</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="financeiro">Arquivo CSV</Label>
                <Input
                  id="financeiro"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFinanceiroFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center text-sm text-purple-600 hover:text-purple-800 font-medium">
                  <Info className="w-4 h-4 mr-1" /> Colunas Esperadas{' '}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md font-mono leading-relaxed">
                  tipo, descricao, valor, data_vencimento, data_pagamento, status, categoria,
                  nome_cliente, telefone_cliente
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-orange-600" /> 4. Fluxo Pagto
            </CardTitle>
            <CardDescription>Upload do arquivo fluxo_pagamentos.csv</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="fluxo">Arquivo CSV</Label>
                <Input
                  id="fluxo"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFluxoFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              <a
                href="data:text/csv;charset=utf-8,vencimento,valor,fornecedor,status,observacoes%0A25/12/2026,1500.50,Fornecedor Exemplo,pendente,Observacao Teste"
                download="template_fluxo_pagamentos.csv"
                className="text-xs text-orange-600 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Baixar Template
              </a>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center text-sm text-orange-600 hover:text-orange-800 font-medium">
                  <Info className="w-4 h-4 mr-1" /> Colunas Esperadas{' '}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md font-mono leading-relaxed">
                  vencimento (DD/MM/YYYY), valor, fornecedor, status (pendente/pago), observacoes
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> 5. Acompanhamento
            </CardTitle>
            <CardDescription>Upload acompanhamento_vendas.csv</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="acompanhamento">Arquivo CSV</Label>
                <Input
                  id="acompanhamento"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setAcompanhamentoFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              <a
                href="data:text/csv;charset=utf-8,M%C3%AAs,Vendedor,Nome%20do%20cliente%20ou%20fornecedor,Valor,Valor%20baixado%20%28bruto%29,Valor%20a%20vencer,Valor%20vencido,Valor%20da%20perda%0A25/12/2026,Joao,Maria,1500,500,1000,0,0"
                download="template_acompanhamento_vendas.csv"
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Baixar Template
              </a>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  <Info className="w-4 h-4 mr-1" /> Colunas Esperadas{' '}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md font-mono leading-relaxed">
                  Mês, Vendedor, Nome do cliente ou fornecedor, Valor, Valor baixado (bruto), Valor
                  a vencer, Valor vencido, Valor da perda
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-end gap-3 pt-4">
        <Button variant="outline" asChild className="md:hidden">
          <Link to="/relatorios/fluxo-pagamentos">
            <TrendingDown className="w-4 h-4 mr-2" />
            Ver Relatório Fluxo
          </Link>
        </Button>
        <Button
          onClick={handleImport}
          disabled={
            loading ||
            (!pessoasFile && !vendasFile && !financeiroFile && !fluxoFile && !acompanhamentoFile)
          }
          className="w-full md:w-auto h-12 px-8 text-base shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando e Importando...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Processar Importação
            </>
          )}
        </Button>
      </div>

      {results && (
        <Card className="mt-8 border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-900/50 animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-6 h-6" /> Relatório de Auditoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="bg-white dark:bg-background border rounded-lg p-5 text-center shadow-sm">
                <div className="text-4xl font-bold text-primary">{results.pacientes}</div>
                <div className="text-sm font-medium text-muted-foreground mt-2">
                  Pacientes Importados
                </div>
              </div>
              <div className="bg-white dark:bg-background border rounded-lg p-5 text-center shadow-sm">
                <div className="text-4xl font-bold text-primary">{results.vendas}</div>
                <div className="text-sm font-medium text-muted-foreground mt-2">
                  Vendas Vinculadas
                </div>
              </div>
              <div className="bg-white dark:bg-background border rounded-lg p-5 text-center shadow-sm">
                <div className="text-4xl font-bold text-primary">{results.receitas}</div>
                <div className="text-sm font-medium text-muted-foreground mt-2">
                  Faturas (Receitas)
                </div>
              </div>
              <div className="bg-white dark:bg-background border rounded-lg p-5 text-center shadow-sm">
                <div className="text-4xl font-bold text-primary">{results.despesas}</div>
                <div className="text-sm font-medium text-muted-foreground mt-2">Contas a Pagar</div>
              </div>
              <div className="bg-white dark:bg-background border rounded-lg p-5 text-center shadow-sm">
                <div className="text-4xl font-bold text-orange-600">{results.fluxo}</div>
                <div className="text-sm font-medium text-muted-foreground mt-2">
                  Fluxo Pagamentos
                </div>
              </div>
              <div className="bg-white dark:bg-background border rounded-lg p-5 text-center shadow-sm">
                <div className="text-4xl font-bold text-indigo-600">
                  {results.acompanhamento.registros}
                </div>
                <div className="text-sm font-medium text-muted-foreground mt-2">Acompanhamento</div>
              </div>
            </div>

            {results.acompanhamento && results.acompanhamento.registros > 0 && (
              <div className="mt-6 border-t border-indigo-100 dark:border-indigo-900/30 pt-6">
                <h4 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-4 text-lg">
                  Resumo de Acompanhamento (Importado agora)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-lg p-4">
                    <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      Total Importado
                    </div>
                    <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">
                      {results.acompanhamento.registros} reg.
                    </div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-lg p-4">
                    <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      Total a Vencer
                    </div>
                    <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(results.acompanhamento.aVencer)}
                    </div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-lg p-4">
                    <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      Total Vencido
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(results.acompanhamento.vencido)}
                    </div>
                  </div>
                </div>

                <div className="border rounded-md bg-white dark:bg-black/40 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-right">Total Valor de Vendas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(results.acompanhamento.vendedores)
                        .sort((a, b) => b[1] - a[1])
                        .map(([vend, total]) => (
                          <TableRow key={vend}>
                            <TableCell className="font-medium">{vend}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(total)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {results.erros.length > 0 && (
              <div className="mt-6 border-t border-red-100 dark:border-red-900/30 pt-6">
                <h4 className="font-semibold text-red-600 flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5" /> Avisos e Falhas ({results.erros.length})
                </h4>
                <div className="bg-white dark:bg-black rounded-md border p-4 max-h-64 overflow-y-auto">
                  <ul className="text-sm text-slate-600 dark:text-slate-400 font-mono space-y-2">
                    {results.erros.map((err, i) => (
                      <li
                        key={i}
                        className="pb-2 border-b last:border-0 border-border/50 break-words"
                      >
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
