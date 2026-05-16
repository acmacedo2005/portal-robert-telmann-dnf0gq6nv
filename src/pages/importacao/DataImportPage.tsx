import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Database,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Info,
  ChevronDown,
} from 'lucide-react'

import pb from '@/lib/pocketbase/client'
import {
  parseCSV,
  parseBrCurrency,
  parseBrDate,
  normName,
  normPhone,
  getField,
} from '@/lib/import-utils'

export default function DataImportPage() {
  const { toast } = useToast()
  const [pessoasFile, setPessoasFile] = useState<File | null>(null)
  const [vendasFile, setVendasFile] = useState<File | null>(null)
  const [financeiroFile, setFinanceiroFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    pacientes: number
    vendas: number
    receitas: number
    despesas: number
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
    if (!pessoasFile && !vendasFile && !financeiroFile) {
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

        // Fallback to name only if phone is missing
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
              `Linha ${i + 2} (Vendas): Paciente não encontrado para venda (${row.nome_cliente || 'Desconhecido'})`,
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
            logs.push(
              `Linha ${i + 2} (Vendas): Erro ao importar venda para ${row.nome_cliente || 'Desconhecido'} - ${err.message}`,
            )
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
              logs.push(
                `Linha ${i + 2} (Financeiro): Fatura ignorada - Paciente não encontrado (${row.nome_cliente || row.descricao || 'Desconhecido'})`,
              )
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
              const validCategorias = [
                'aluguel',
                'fornecedores',
                'salarios',
                'utilitarios',
                'outros',
                'taxas_cartao',
                'faturas',
                'contas_pagar',
                'receita',
                'despesa',
              ]
              if (!validCategorias.includes(categoria)) categoria = 'outros'

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
          } else {
            logs.push(
              `Linha ${i + 2} (Financeiro): Ignorada - Tipo '${tipo}' inválido (esperado 'receita' ou 'despesa').`,
            )
          }
        }
      }

      setResults({
        pacientes: pacientesImportados,
        vendas: vendasImportadas,
        receitas: receitasGeradas,
        despesas: despesasGeradas,
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
      const inputs = document.querySelectorAll('input[type="file"]')
      inputs.forEach((input) => {
        ;(input as HTMLInputElement).value = ''
      })
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in p-6">
      <div className="flex items-center gap-3 mb-8">
        <Database className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Importação</h1>
          <p className="text-muted-foreground mt-1">
            Carregue arquivos CSV para migrar dados legados para o sistema.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" /> 1. Pessoas
            </CardTitle>
            <CardDescription>Upload do arquivo pessoas.csv</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
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
              <div className="grid w-full max-w-sm items-center gap-1.5">
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
              <div className="grid w-full max-w-sm items-center gap-1.5">
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
                  id_financeiro, tipo, descricao, valor, data_vencimento, data_pagamento, status,
                  categoria, forma_pagamento, nome_cliente, telefone_cliente
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleImport}
          disabled={loading || (!pessoasFile && !vendasFile && !financeiroFile)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="text-sm font-medium text-muted-foreground mt-2">
                  Contas a Pagar (Despesas)
                </div>
              </div>
            </div>

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
