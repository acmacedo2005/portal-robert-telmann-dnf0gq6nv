import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
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
  Activity,
  Users,
  CalendarDays,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import {
  parseCSV,
  parseBrCurrency,
  parseBrDate,
  parseExcelOrBrDate,
  normName,
  normPhone,
  getField,
} from '@/lib/import-utils'

function PacientesMigrationDashboard() {
  const [metrics, setMetrics] = useState({ total: 0, ativos: 0, cidadesUnicas: 0 })

  const loadMetrics = async () => {
    try {
      const records = await pb.collection('pacientes').getFullList({ requestKey: null })
      const ativos = records.filter((r) => r.ativo !== false).length
      const cidades = new Set(records.map((r) => r.cidade?.trim().toLowerCase()).filter(Boolean))
      setMetrics({ total: records.length, ativos, cidadesUnicas: cidades.size })
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])
  useRealtime('pacientes', () => loadMetrics())

  return (
    <div className="mb-8 animate-fade-in">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        Dashboard de Pacientes
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pacientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.ativos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cidades Atendidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.cidadesUnicas}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CirurgiasRealizadasDashboard() {
  const [metrics, setMetrics] = useState({ total: 0, aReceber: 0, pagos: 0 })

  const loadMetrics = async () => {
    try {
      const records = await pb.collection('cirurgias_realizadas').getFullList({ requestKey: null })
      let total = records.length
      let aReceber = 0
      let pagos = 0
      records.forEach((r) => {
        aReceber += r.valor_a_receber || 0
        pagos += r.valor_pago || 0
      })
      setMetrics({ total, aReceber, pagos })
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])
  useRealtime('cirurgias_realizadas', () => loadMetrics())

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Relatório de Cirurgias Realizadas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cirurgias Importadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Valores a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                metrics.aReceber,
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Valores Já Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                metrics.pagos,
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DataImportPage() {
  const { toast } = useToast()
  const [pessoasFile, setPessoasFile] = useState<File | null>(null)
  const [vendasFile, setVendasFile] = useState<File | null>(null)
  const [financeiroFile, setFinanceiroFile] = useState<File | null>(null)
  const [fluxoFile, setFluxoFile] = useState<File | null>(null)
  const [acompanhamentoFile, setAcompanhamentoFile] = useState<File | null>(null)
  const [cirurgiasFile, setCirurgiasFile] = useState<File | null>(null)
  const [mestreFile, setMestreFile] = useState<File | null>(null)
  const [mestreAgendamentosFile, setMestreAgendamentosFile] = useState<File | null>(null)
  const [cadastroFile, setCadastroFile] = useState<File | null>(null)
  const [contaAzulFile, setContaAzulFile] = useState<File | null>(null)

  const [isWiping, setIsWiping] = useState(false)
  const [wipeResults, setWipeResults] = useState<{
    pagamentos: number
    contas_receber: number
    vendas: number
    status: string
  } | null>(null)

  const [loading, setLoading] = useState(false)
  const [importProgress, setImportProgress] = useState<{
    current: number
    total: number
    status: string
  } | null>(null)

  const [results, setResults] = useState<{
    pacientes: number
    vendas: number
    receitas: number
    despesas: number
    fluxo: number
    cirurgiasRealizadas: number
    acompanhamento: {
      registros: number
      vendedores: Record<string, number>
      aVencer: number
      vencido: number
    }
    mestreAgendamentos: {
      total: number
      concluido: number
      agendado: number
      medicosUnicos: number
    }
    cadastro: {
      total: number
      f: number
      j: number
      cidades: number
      incompletos: number
      successMsg: string
    }
    contaAzul: {
      vendasImportadas: number
      clientesLocalizados: number
      clientesNovos: number
      contasReceberCriadas: number
      valorTotalVendas: number
      lotesProcessados: number
      lotesComErro: number
    }
    erros: string[]
  } | null>(null)

  const handleWipeVendas = async () => {
    setIsWiping(true)
    setWipeResults(null)
    try {
      const resPagamentos = await pb.collection('pagamentos').getList(1, 1, { requestKey: null })
      const resContas = await pb.collection('contas_receber').getList(1, 1, { requestKey: null })
      const resVendas = await pb.collection('vendas').getList(1, 1, { requestKey: null })

      const counts = {
        pagamentos: resPagamentos.totalItems,
        contas_receber: resContas.totalItems,
        vendas: resVendas.totalItems,
      }

      await pb.send('/backend/v1/import/wipe-vendas', { method: 'POST' })

      setWipeResults({
        ...counts,
        status: 'Banco limpo e pronto para reimportar',
      })
      toast({ title: 'Sucesso', description: 'Dados de vendas removidos com sucesso.' })
    } catch (err: any) {
      toast({
        title: 'Erro de Exclusão',
        description: err.message || 'Erro ao limpar dados de vendas.',
        variant: 'destructive',
      })
    } finally {
      setIsWiping(false)
    }
  }

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const withRetry = async <T,>(
    operation: () => Promise<T>,
    retries = 3,
    delayMs = 5000,
  ): Promise<T> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation()
      } catch (err: any) {
        if ((err.status === 429 || err?.response?.code === 429) && attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs))
        } else {
          throw err
        }
      }
    }
    throw new Error('Maximum retries reached')
  }

  const handleImport = async () => {
    if (
      !pessoasFile &&
      !vendasFile &&
      !financeiroFile &&
      !fluxoFile &&
      !acompanhamentoFile &&
      !cirurgiasFile &&
      !mestreFile &&
      !mestreAgendamentosFile &&
      !cadastroFile &&
      !contaAzulFile
    ) {
      toast({
        title: 'Aviso',
        description: 'Selecione pelo menos um arquivo para importar.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setResults(null)
    setImportProgress({ current: 0, total: 0, status: 'Inicializando...' })

    const logs: string[] = []
    let pacientesImportados = 0
    let vendasImportadas = 0
    let receitasGeradas = 0
    let despesasGeradas = 0
    let fluxoImportados = 0
    let cirurgiasRealizadasImportadas = 0
    const acompanhamentoRes = {
      registros: 0,
      vendedores: {} as Record<string, number>,
      aVencer: 0,
      vencido: 0,
    }
    const mestreAgendamentosRes = {
      total: 0,
      concluido: 0,
      agendado: 0,
      medicosUnicos: 0,
    }
    const cadastroResData = {
      total: 0,
      f: 0,
      j: 0,
      cidades: 0,
      incompletos: 0,
      successMsg: '',
    }
    const contaAzulRes = {
      vendasImportadas: 0,
      clientesLocalizados: 0,
      clientesNovos: 0,
      contasReceberCriadas: 0,
      valorTotalVendas: 0,
      lotesProcessados: 0,
      lotesComErro: 0,
    }

    try {
      const existingPacientes = await pb.collection('pacientes').getFullList({ requestKey: null })
      const patientMap = new Map<string, string>()
      const patientMapById = new Map<number, string>()
      const patientMapByDoc = new Map<string, string>()

      for (const p of existingPacientes) {
        const key = `${normName(p.nome)}|${normPhone(p.telefone)}`
        patientMap.set(key, p.id)
        if (p.patient_id) patientMapById.set(p.patient_id, p.id)
        if (p.cpf_cnpj) patientMapByDoc.set(normPhone(p.cpf_cnpj), p.id)
      }

      const allUsers = await pb.collection('users').getFullList({ requestKey: null })
      const userMapByName = new Map<string, string>()
      for (const u of allUsers) {
        if (u.name) userMapByName.set(normName(u.name), u.id)
      }
      const fallbackUserId = allUsers[0]?.id

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

      // Import Conta Azul Vendas
      if (contaAzulFile) {
        setImportProgress({ current: 0, total: 0, status: 'Lendo arquivo Conta Azul...' })
        const isXlsx = contaAzulFile.name.toLowerCase().endsWith('.xlsx')
        let rawData: any[] = []
        if (isXlsx) {
          const buffer = await contaAzulFile.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        } else {
          const text = await readFile(contaAzulFile)
          rawData = parseCSV(text)
        }

        const existingVendasRaw = await pb
          .collection('vendas')
          .getFullList({ fields: 'numero_venda', requestKey: null })
        const existingNumbers = new Set(
          existingVendasRaw.map((v) => v.numero_venda).filter((n) => n !== null && n !== undefined),
        )

        // Filter duplicates in the same file
        const uniqueDataMap = new Map<number, any>()
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i]
          const cleanRow: any = {}
          for (const key in row) {
            const cleanKey = String(key)
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
            cleanRow[cleanKey] = row[key]
          }

          const numeroRaw = String(
            cleanRow['numero_venda'] ||
              cleanRow['numero'] ||
              cleanRow['venda'] ||
              cleanRow['numero da venda'] ||
              cleanRow['id'] ||
              '',
          )
          const numeroStr = numeroRaw.replace(/\D/g, '')
          const numero_venda = numeroStr ? parseInt(numeroStr, 10) : null

          if (numero_venda && !isNaN(numero_venda)) {
            if (!uniqueDataMap.has(numero_venda)) {
              cleanRow._originalIndex = i + 2
              cleanRow._numero_venda = numero_venda
              uniqueDataMap.set(numero_venda, cleanRow)
            }
          } else {
            logs.push(`Conta Azul (Linha ${i + 2}): ignorada - sem número de venda válido.`)
          }
        }

        const dataToProcess = Array.from(uniqueDataMap.values())
        setImportProgress({
          current: 0,
          total: dataToProcess.length,
          status: 'Processando lotes (20 registros/lote)...',
        })

        const BATCH_SIZE = 20

        for (let i = 0; i < dataToProcess.length; i += BATCH_SIZE) {
          const batch = dataToProcess.slice(i, i + BATCH_SIZE)
          let batchErrors = 0

          for (const cleanRow of batch) {
            try {
              const originalLine = cleanRow._originalIndex
              const numero_venda = cleanRow._numero_venda

              if (existingNumbers.has(numero_venda)) {
                continue
              }

              const valorTotalRaw = String(
                cleanRow['valor_total'] ||
                  cleanRow['valor total'] ||
                  cleanRow['valor'] ||
                  cleanRow['total'] ||
                  '0',
              )
              const valorTotal = parseBrCurrency(valorTotalRaw)

              const valorDescontoRaw = String(
                cleanRow['valor_desconto'] || cleanRow['desconto'] || '0',
              )
              const valorDesconto = parseBrCurrency(valorDescontoRaw)

              const observacoesRaw = String(
                cleanRow['observacoes de vendas'] ||
                  cleanRow['observacoes'] ||
                  cleanRow['observacao'] ||
                  '',
              )

              const vendedorRaw = String(cleanRow['vendedor'] || '')
              let vendedorId = null
              if (vendedorRaw) {
                const vMatch = userMapByName.get(normName(vendedorRaw))
                if (vMatch) vendedorId = vMatch
              }

              const formaPagamento = String(
                cleanRow['forma de pagamento'] ||
                  cleanRow['forma pagamento'] ||
                  cleanRow['condicao de pagamento'] ||
                  '',
              )
              const servicoRaw = String(
                cleanRow['produtos/servicos'] ||
                  cleanRow['produto/servico'] ||
                  cleanRow['servico'] ||
                  '',
              )

              const obsList = []
              if (servicoRaw) obsList.push(`Serviço: ${servicoRaw}`)
              if (formaPagamento) obsList.push(`Pagamento: ${formaPagamento}`)
              if (observacoesRaw) obsList.push(`Obs: ${observacoesRaw}`)
              const observacoes = obsList.join(' | ')

              const dataVendaRaw = String(
                cleanRow['data venda'] ||
                  cleanRow['data da venda'] ||
                  cleanRow['emissao'] ||
                  cleanRow['data'] ||
                  '',
              )
              const dataVendaStr = parseExcelOrBrDate(dataVendaRaw)
              const dataVenda = dataVendaStr || new Date().toISOString()

              const dataCancelamentoRaw = String(
                cleanRow['data cancelamento'] ||
                  cleanRow['data de cancelamento'] ||
                  cleanRow['cancelamento'] ||
                  '',
              )
              const dataCancelamento = parseExcelOrBrDate(dataCancelamentoRaw)

              const docRaw = String(
                cleanRow['cpf_cnpj'] ||
                  cleanRow['cpf'] ||
                  cleanRow['cnpj'] ||
                  cleanRow['cpf/cnpj'] ||
                  cleanRow['cpf/cnpj do cliente'] ||
                  '',
              )
              const docClean = normPhone(docRaw)
              const nomeRaw = String(
                cleanRow['cliente'] || cleanRow['nome'] || cleanRow['nome do cliente'] || '',
              )
              const nomeClean = normName(nomeRaw)

              let pid = null

              // Patient resolution
              if (docClean && patientMapByDoc.has(docClean)) {
                pid = patientMapByDoc.get(docClean)
                contaAzulRes.clientesLocalizados++
              } else if (nomeClean) {
                for (const [k, v] of patientMap.entries()) {
                  if (k.startsWith(nomeClean + '|')) {
                    pid = v
                    contaAzulRes.clientesLocalizados++
                    break
                  }
                }
              }

              // Create Patient if not found
              if (!pid && (nomeRaw || docClean)) {
                const pData = {
                  nome: nomeRaw || 'Cliente Sem Nome',
                  cpf_cnpj: docClean,
                  tipo: 'Cliente',
                  ativo: true,
                }
                const novo = await withRetry(() =>
                  pb.collection('pacientes').create(pData, { requestKey: null }),
                )
                pid = novo.id
                if (docClean) patientMapByDoc.set(docClean, pid)
                if (nomeClean) patientMap.set(`${nomeClean}|`, pid)
                contaAzulRes.clientesNovos++
              }

              if (!pid) {
                logs.push(`Conta Azul (Linha ${originalLine}): ignorada - sem cliente.`)
                continue
              }

              const isCancelada = !!dataCancelamento
              const statusVenda = isCancelada ? 'Cancelada' : 'Ativa'

              const vendaData: any = {
                paciente_id: pid,
                tipo: 'tratamento',
                valor_total: valorTotal,
                desconto_cortesia: valorDesconto,
                valor_final: Math.max(0, valorTotal - valorDesconto),
                status: statusVenda,
                data_venda: dataVenda,
                numero_venda: numero_venda,
                data_cancelamento: dataCancelamento || null,
                observacoes: observacoes,
              }

              if (vendedorId) {
                vendaData.vendedor_id = vendedorId
              }

              // Create Venda
              const venda = await withRetry(() =>
                pb.collection('vendas').create(vendaData, { requestKey: null }),
              )
              contaAzulRes.vendasImportadas++
              contaAzulRes.valorTotalVendas += valorTotal
              existingNumbers.add(numero_venda)

              // Create Contas a Receber for Active sales
              if (!isCancelada) {
                const d = new Date(dataVenda)
                d.setDate(d.getDate() + 30)
                const dtVencimento = d.toISOString()

                await withRetry(() =>
                  pb.collection('contas_receber').create(
                    {
                      venda_id: venda.id,
                      paciente_id: pid,
                      valor_total: valorTotal,
                      valor_recebido: 0,
                      valor_pendente: valorTotal,
                      status: 'Pendente',
                      data_vencimento: dtVencimento,
                    },
                    { requestKey: null },
                  ),
                )
                contaAzulRes.contasReceberCriadas++
              }
            } catch (err: any) {
              logs.push(
                `Conta Azul (Linha ${cleanRow._originalIndex}): erro no processamento - ${err.message}`,
              )
              batchErrors++
            }
          }

          if (batchErrors === 0) contaAzulRes.lotesProcessados++
          else contaAzulRes.lotesComErro++

          setImportProgress({
            current: Math.min(i + BATCH_SIZE, dataToProcess.length),
            total: dataToProcess.length,
            status: `Lote ${Math.floor(i / BATCH_SIZE) + 1} processado...`,
          })

          if (i + BATCH_SIZE < dataToProcess.length) {
            await new Promise((r) => setTimeout(r, 2000))
          }
        }
      }

      // Import Planilha Mestre
      if (cadastroFile) {
        setImportProgress({ current: 0, total: 0, status: 'Lendo Cadastro Master...' })
        const isXlsx = cadastroFile.name.toLowerCase().endsWith('.xlsx')
        let data: any[] = []

        if (isXlsx) {
          const buffer = await cadastroFile.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

          data = rawData.map((row) => {
            const newRow: any = {}
            for (const key in row) {
              const cleanKey = String(key)
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
              newRow[cleanKey] = row[key]
            }
            return newRow
          })
        } else {
          const text = await readFile(cadastroFile)
          data = parseCSV(text)
        }

        try {
          logs.push('Iniciando limpeza crítica do banco de dados (Wipe)...')
          await pb.send('/backend/v1/import/wipe', { method: 'POST' })
          logs.push('Banco de dados limpo com sucesso.')

          patientMap.clear()
          patientMapById.clear()
          patientMapByDoc.clear()
        } catch (err: any) {
          logs.push(`Erro ao limpar o banco: ${err.message}`)
        }

        const cities = new Set<string>()
        const seenCpfCnpj = new Set<string>()

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const nome = String(row.nome || row.cliente || '')
          const emailRaw = String(row.email || '')
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          const email = emailRegex.test(emailRaw) ? emailRaw : ''

          const fone_comercial = normPhone(
            String(row.fone_comercial || row.telefone_comercial || ''),
          )
          const fone_celular = normPhone(
            String(row.fone_celular || row.telefone_celular || row.celular || row.telefone || ''),
          )

          let cpf_cnpj = normPhone(String(row.cpf_cnpj || row.cpf || row.cnpj || ''))

          const tipo_pessoa = String(row.tipo_pessoa || row.fisica_juridica || 'F')
            .toUpperCase()
            .startsWith('J')
            ? 'J'
            : 'F'
          if (tipo_pessoa === 'J') cadastroResData.j++
          else cadastroResData.f++

          const cidade = String(row.cidade || '')
          if (cidade) cities.add(cidade.toLowerCase().trim())

          let isIncomplete = false
          if (!nome) isIncomplete = true
          if (!fone_celular && !email) isIncomplete = true

          if (isIncomplete) {
            cadastroResData.incompletos++
            logs.push(
              `Linha ${i + 2} (Cadastro Master): Registro incompleto (Nome: ${nome || 'vazio'})`,
            )
          }

          if (cpf_cnpj && seenCpfCnpj.has(cpf_cnpj)) {
            logs.push(
              `Linha ${i + 2} (Cadastro Master): Duplicidade evitada para CPF/CNPJ ${cpf_cnpj}`,
            )
            continue
          }
          if (cpf_cnpj) seenCpfCnpj.add(cpf_cnpj)

          try {
            const dtRaw = String(row.dt_aniversario || row.aniversario || row.data_nascimento || '')

            const payload = {
              nome: nome || 'Sem Nome',
              email,
              fone_celular,
              fone_comercial,
              telefone: fone_celular || fone_comercial,
              cpf_cnpj,
              tipo_pessoa,
              tipo: String(row.tipo || 'Cliente'),
              inscricao_estadual: String(row.inscricao_estadual || ''),
              dt_aniversario: parseExcelOrBrDate(dtRaw) || null,
              endereco: String(row.endereco || row.rua || ''),
              numero: String(row.numero || ''),
              complemento: String(row.complemento || ''),
              bairro: String(row.bairro || ''),
              cep: String(row.cep || ''),
              cidade,
              estado: String(row.estado || row.uf || ''),
              ativo: true,
            }

            const novo = await pb.collection('pacientes').create(payload, { requestKey: null })

            const key = `${normName(nome)}|${normPhone(payload.telefone)}`
            patientMap.set(key, novo.id)
            if (cpf_cnpj) patientMapByDoc.set(cpf_cnpj, novo.id)

            pacientesImportados++
            cadastroResData.total++
          } catch (err: any) {
            logs.push(`Linha ${i + 2} (Cadastro Master): Erro - ${err.message}`)
          }
        }
        cadastroResData.cidades = cities.size
        cadastroResData.successMsg = 'Banco limpo e pronto para receber novas informações'
      }

      if (mestreFile) {
        setImportProgress({ current: 0, total: 0, status: 'Processando Pacientes Mestre...' })
        const text = await readFile(mestreFile)
        const data = parseCSV(text)

        const uniqueData = new Map()
        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const pid = row['patient_id'] || row['patient id']
          if (pid) {
            uniqueData.set(pid, row)
          } else {
            uniqueData.set(`row-${i}`, row)
          }
        }

        const dataToProcess = Array.from(uniqueData.values())

        for (let i = 0; i < dataToProcess.length; i++) {
          const row = dataToProcess[i]
          const patientIdRaw = String(row['patient_id'] || row['patient id'] || '')
          const patientId = patientIdRaw ? parseInt(patientIdRaw, 10) : null
          const nome = String(row['name'] || row['nome'] || '')

          if (!nome) {
            logs.push(`Planilha Mestre: Linha ignorada - Nome não fornecido.`)
            continue
          }

          const strActive = String(row['active'] || row['ativo'] || '')
            .toLowerCase()
            .trim()
          const ativo =
            strActive === 't' || strActive === 'true' || strActive === '1' || strActive === 'yes'

          const pacienteData: any = {
            nome: nome,
            civil_name: String(row['civil_name'] || row['civil name'] || ''),
            telefone: normPhone(
              String(row['mobile_phone'] || row['mobile phone'] || row['telefone'] || ''),
            ),
            home_phone: normPhone(String(row['home_phone'] || row['home phone'] || '')),
            email: String(row['email'] || ''),
            genero: String(row['gender'] || row['genero'] || ''),
            cpf_cnpj: String(row['cpf'] || ''),
            rg: String(row['rg'] || ''),
            endereco: String(row['address'] || row['endereco'] || ''),
            numero: String(row['number'] || row['numero'] || ''),
            complemento: String(row['complement'] || row['complemento'] || ''),
            bairro: String(row['neighborhood'] || row['bairro'] || ''),
            cidade: String(row['city'] || row['cidade'] || ''),
            estado: String(row['state'] || row['estado'] || ''),
            cep: String(row['zip_code'] || row['zip code'] || row['cep'] || ''),
            ativo: ativo,
            observacoes_clinicas: String(row['observation'] || row['observacao'] || ''),
          }

          if (patientId) pacienteData.patient_id = patientId
          const dataNasc = parseBrDate(String(row['birthdate'] || row['data_nascimento'] || ''))
          if (dataNasc) pacienteData.data_nascimento = dataNasc

          try {
            let existingId = null
            if (patientId) {
              try {
                const existing = await pb
                  .collection('pacientes')
                  .getFirstListItem(`patient_id=${patientId}`, { requestKey: null })
                existingId = existing.id
              } catch {
                /* intentionally ignored */
              }
            }

            if (!existingId && pacienteData.cpf_cnpj) {
              try {
                const existing = await pb
                  .collection('pacientes')
                  .getFirstListItem(`cpf_cnpj="${pacienteData.cpf_cnpj}"`, { requestKey: null })
                existingId = existing.id
              } catch {
                /* intentionally ignored */
              }
            }

            if (existingId) {
              await pb
                .collection('pacientes')
                .update(existingId, pacienteData, { requestKey: null })
            } else {
              await pb.collection('pacientes').create(pacienteData, { requestKey: null })
            }
            pacientesImportados++
          } catch (err: any) {
            logs.push(
              `Planilha Mestre: Erro ao importar paciente ID ${patientIdRaw || nome} - ${err.message}`,
            )
          }
        }
      }

      if (mestreAgendamentosFile) {
        setImportProgress({ current: 0, total: 0, status: 'Processando Agendamentos Mestre...' })
        const text = await readFile(mestreAgendamentosFile)
        const data = parseCSV(text)

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const medicosSet = new Set<string>()

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const dateRaw = String(row.date || row.data || '')
          if (!dateRaw) continue

          const parsedDateStr = parseExcelOrBrDate(dateRaw)
          if (!parsedDateStr) continue

          const dtObj = new Date(parsedDateStr)
          dtObj.setHours(0, 0, 0, 0)

          const isConcluido = dtObj < today
          const status = isConcluido ? 'concluido' : 'agendado'

          const physicianIdStr = String(row.physician_id || row['physician id'] || '')
          const physicianIdNum = parseInt(physicianIdStr, 10) || null
          const physicianName = String(row.physician_name || row['physician name'] || '')

          if (physicianName) medicosSet.add(physicianName)
          else if (physicianIdNum) medicosSet.add(physicianIdNum.toString())

          const patientIdRaw = String(row.patient_id || row['patient id'] || '')
          const patientIdNum = parseInt(patientIdRaw, 10) || null
          const pbPacienteId = patientIdNum ? patientMapById.get(patientIdNum) : null
          const pbProfissionalId = userMapByName.get(normName(physicianName)) || fallbackUserId

          try {
            await pb.collection('agendamentos').create(
              {
                pk: String(row.pk || ''),
                patient_id: patientIdNum,
                physician_id: physicianIdNum,
                physician_name: physicianName,
                date: parsedDateStr,
                start_time: String(row.start_time || row['start time'] || ''),
                end_time: String(row.end_time || row['end time'] || ''),
                procedure_pack: String(
                  row.procedure_pack || row['procedure pack'] || row.procedure || '',
                ),
                observation: String(row.observation || row.observacoes || ''),
                date_added:
                  parseExcelOrBrDate(String(row.date_added || row['date added'] || '')) || null,
                updated_at:
                  parseExcelOrBrDate(String(row.updated_at || row['updated at'] || '')) || null,
                status: status,

                paciente_id: pbPacienteId,
                profissional_id: pbProfissionalId,
                data_agendamento: parsedDateStr,
                hora_agendamento: String(row.start_time || row['start time'] || ''),
                tipo: 'avaliacao',
              },
              { requestKey: null },
            )

            mestreAgendamentosRes.total++
            if (isConcluido) mestreAgendamentosRes.concluido++
            else mestreAgendamentosRes.agendado++
          } catch (err: any) {
            logs.push(`Mestre Agendamentos: Erro na linha ${i + 2} - ${err.message}`)
          }
        }
        mestreAgendamentosRes.medicosUnicos = medicosSet.size
      }

      if (pessoasFile) {
        setImportProgress({ current: 0, total: 0, status: 'Processando Pessoas...' })
        const text = await readFile(pessoasFile)
        const data = parseCSV(text)

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const nome = String(row.nome || getField(row, ['nome']))
          const telefone = String(row.telefone || getField(row, ['telefone']))
          if (!nome) {
            logs.push(`Linha ${i + 2} (Pessoas): Paciente ignorado - Nome não fornecido.`)
            continue
          }

          const key = `${normName(nome)}|${normPhone(telefone)}`
          if (!patientMap.has(key)) {
            try {
              const novo = await pb.collection('pacientes').create(
                {
                  nome: nome,
                  telefone: telefone,
                  email: String(row.email || ''),
                  endereco: String(row.endereco || row.rua || ''),
                  numero: String(row.numero || ''),
                  complemento: String(row.complemento || ''),
                  bairro: String(row.bairro || ''),
                  cidade: String(row.cidade || ''),
                  estado: String(row.estado || ''),
                  cep: String(row.cep || ''),
                  data_nascimento:
                    parseBrDate(String(row.data_nascimento || row.nascimento || '')) || null,
                  genero: String(row.genero || ''),
                },
                { requestKey: null },
              )
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

      if (vendasFile) {
        setImportProgress({ current: 0, total: 0, status: 'Processando Vendas Antigas...' })
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
            let status = String(row.status || '').toLowerCase()
            if (!['pendente', 'paga', 'parcial'].includes(status)) status = 'pendente'

            const valorTotal = parseBrCurrency(String(row.valor_total || row.valor || ''))
            const entradaPaga = parseBrCurrency(String(row.entrada_paga || ''))

            await pb.collection('vendas').create(
              {
                paciente_id: pid,
                tipo: 'tratamento',
                valor_total: valorTotal,
                valor_final: valorTotal,
                entrada_paga: entradaPaga,
                status: status,
                data_venda:
                  parseBrDate(String(row.data_proposta || row.data_venda || row.data || '')) ||
                  new Date().toISOString(),
                observacoes: String(row.observacoes || row.id_proposta || ''),
              },
              { requestKey: null },
            )
            vendasImportadas++
          } catch (err: any) {
            logs.push(`Linha ${i + 2} (Vendas): Erro ao importar venda - ${err.message}`)
          }
        }
      }

      if (financeiroFile) {
        setImportProgress({ current: 0, total: 0, status: 'Processando Financeiro...' })
        const text = await readFile(financeiroFile)
        const data = parseCSV(text)

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const tipo = String(row.tipo || '').toLowerCase()
          const valor = parseBrCurrency(String(row.valor || ''))
          const dtVencimento =
            parseBrDate(String(row.data_vencimento || '')) || new Date().toISOString()
          const dtPagamento = parseBrDate(String(row.data_pagamento || ''))

          if (tipo === 'receita') {
            const pid = findPatient(row)
            if (!pid) {
              logs.push(`Linha ${i + 2} (Financeiro): Receita ignorada - Paciente não encontrado`)
              continue
            }

            try {
              let status = String(row.status || '').toLowerCase()
              if (!['pendente', 'vencida', 'paga', 'parcial'].includes(status)) status = 'pendente'

              await pb.collection('faturas').create(
                {
                  paciente_id: pid,
                  valor: valor,
                  data_vencimento: dtVencimento,
                  data_pagamento: dtPagamento || null,
                  status: status,
                  observacoes: String(row.descricao || row.observacoes || ''),
                },
                { requestKey: null },
              )
              receitasGeradas++
            } catch (err: any) {
              logs.push(`Linha ${i + 2} (Financeiro): Erro ao importar receita - ${err.message}`)
            }
          } else if (tipo === 'despesa') {
            try {
              let status = String(row.status || '').toLowerCase()
              if (!['pendente', 'vencida', 'paga'].includes(status)) status = 'pendente'

              let categoria = String(row.categoria || '').toLowerCase()
              if (!categoria) categoria = 'outros'

              await pb.collection('contas_pagar').create(
                {
                  descricao: String(row.descricao || 'Despesa Importada'),
                  fornecedor: String(row.nome_cliente || row.fornecedor || 'Desconhecido'),
                  valor: valor,
                  status: status,
                  categoria: categoria,
                  data_vencimento: dtVencimento,
                  data_pagamento: dtPagamento || null,
                  observacoes: String(row.observacoes || ''),
                },
                { requestKey: null },
              )
              despesasGeradas++
            } catch (err: any) {
              logs.push(`Linha ${i + 2} (Financeiro): Erro ao importar despesa - ${err.message}`)
            }
          }
        }
      }

      if (fluxoFile) {
        setImportProgress({ current: 0, total: 0, status: 'Processando Fluxo de Pagamentos...' })
        const text = await readFile(fluxoFile)
        const data = parseCSV(text)

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const vencimentoRaw = String(row.vencimento || row.data_vencimento || '')
          const vencimento = parseBrDate(vencimentoRaw)
          const valor = parseBrCurrency(String(row.valor || ''))
          const fornecedor = String(row.fornecedor || row.nome || row.descricao || '')

          if (!vencimento || !fornecedor) {
            logs.push(
              `Linha ${i + 2} (Fluxo Pagamentos): Ignorada - Vencimento ou Fornecedor ausentes.`,
            )
            continue
          }

          try {
            let status = String(row.status || '').toLowerCase()
            if (!['pendente', 'pago', 'vencido', 'cancelado'].includes(status)) status = 'pendente'

            await pb.collection('fluxo_pagamentos').create(
              {
                vencimento: vencimento,
                valor: valor,
                fornecedor: fornecedor,
                observacoes: String(row.observacoes || ''),
                status: status,
                data_pagto: parseBrDate(String(row.data_pagto || row.data_pagamento || '')) || null,
              },
              { requestKey: null },
            )
            fluxoImportados++
          } catch (err: any) {
            logs.push(`Linha ${i + 2} (Fluxo Pagamentos): Erro - ${err.message}`)
          }
        }
      }

      if (acompanhamentoFile) {
        setImportProgress({ current: 0, total: 0, status: 'Processando Acompanhamento...' })
        const text = await readFile(acompanhamentoFile)
        const data = parseCSV(text)

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const mesStr = String(row['mes'] || row['mês'] || row['data'] || '')
          const mes = parseExcelOrBrDate(mesStr)
          const vendedor = String(row['vendedor'] || '')
          const nomeCliente = String(
            row['nome do cliente ou fornecedor'] || row['nome'] || row['cliente'] || '',
          )

          if (!vendedor || !nomeCliente) {
            logs.push(
              `Linha ${i + 2} (Acompanhamento): Ignorada - Vendedor ou Nome do Cliente ausentes.`,
            )
            continue
          }

          const valor = parseBrCurrency(String(row['valor'] || ''))
          const valorBaixado = parseBrCurrency(
            String(row['valor baixado (bruto)'] || row['valor baixado'] || ''),
          )
          const valorVencer = parseBrCurrency(
            String(row['valor a vencer'] || row['valor a receber'] || ''),
          )
          const valorVencido = parseBrCurrency(String(row['valor vencido'] || ''))
          const valorPerda = parseBrCurrency(String(row['valor da perda'] || ''))

          try {
            await pb.collection('acompanhamento_vendas').create(
              {
                mes: mes || new Date().toISOString(),
                vendedor: vendedor,
                nome_cliente: nomeCliente,
                valor: valor,
                valor_baixado: valorBaixado,
                valor_a_vencer: valorVencer,
                valor_vencido: valorVencido,
                valor_perda: valorPerda,
              },
              { requestKey: null },
            )

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

      if (cirurgiasFile) {
        setImportProgress({ current: 0, total: 0, status: 'Processando Cirurgias Realizadas...' })
        const text = await readFile(cirurgiasFile)
        const data = parseCSV(text)

        if (data.length > 0) {
          const expectedHeaders = [
            'consultor',
            'nome do paciente',
            'data cirurgia',
            'valor venda',
            'forma de pagamento',
            'valor pago',
            'valor a receber',
          ]
          const firstRowKeys = Object.keys(data[0])
          const missingHeaders = expectedHeaders.filter(
            (h) => !firstRowKeys.includes(h) && !firstRowKeys.some((k) => k.includes(h)),
          )

          if (missingHeaders.length > 0) {
            throw new Error(
              `O arquivo de Cirurgias Realizadas não contém as colunas esperadas. Faltam: ${missingHeaders.join(', ')}`,
            )
          }
        }

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const nomePaciente = String(row['nome do paciente'] || row['nome'] || '')
          const consultor = String(row['consultor'] || '')

          const nomeLower = nomePaciente.toLowerCase().trim()
          const consultorLower = consultor.toLowerCase().trim()

          if (
            !nomeLower ||
            nomeLower === 'vago' ||
            nomeLower.includes('semana') ||
            nomeLower.includes('total mensal') ||
            nomeLower.includes('médicos') ||
            nomeLower.includes('dr. william') ||
            consultorLower.includes('semana') ||
            consultorLower.includes('total mensal')
          ) {
            continue
          }

          const dataCirurgiaStr = String(row['data cirurgia'] || row['data da cirurgia'] || '')
          const valorVenda = parseBrCurrency(String(row['valor venda'] || ''))
          const formaPagamento = String(row['forma de pagamento'] || row['forma pagamento'] || '')
          const valorPago = parseBrCurrency(String(row['valor pago'] || ''))
          const valorAReceber = parseBrCurrency(
            String(row['valor a receber'] || row['valor à receber'] || ''),
          )

          try {
            await pb.collection('cirurgias_realizadas').create(
              {
                consultor,
                nome_paciente: nomePaciente,
                data_cirurgia: parseExcelOrBrDate(dataCirurgiaStr) || null,
                valor_venda: valorVenda,
                forma_pagamento: formaPagamento,
                valor_pago: valorPago,
                valor_a_receber: valorAReceber,
              },
              { requestKey: null },
            )
            cirurgiasRealizadasImportadas++
          } catch (err: any) {
            logs.push(`Linha ${i + 2} (Cirurgias Realizadas): Erro - ${err.message}`)
          }
        }
      }

      setResults({
        pacientes: pacientesImportados,
        vendas: vendasImportadas,
        receitas: receitasGeradas,
        despesas: despesasGeradas,
        fluxo: fluxoImportados,
        cirurgiasRealizadas: cirurgiasRealizadasImportadas,
        acompanhamento: acompanhamentoRes,
        mestreAgendamentos: mestreAgendamentosRes,
        cadastro: cadastroResData,
        contaAzul: contaAzulRes,
        erros: logs,
      })

      toast({ title: 'Sucesso', description: 'Importação concluída com sucesso.' })
    } catch (error: any) {
      toast({
        title: 'Erro de Processamento',
        description: error.message || 'Ocorreu um erro durante a importação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setImportProgress(null)
      setPessoasFile(null)
      setVendasFile(null)
      setFinanceiroFile(null)
      setFluxoFile(null)
      setAcompanhamentoFile(null)
      setCirurgiasFile(null)
      setMestreFile(null)
      setMestreAgendamentosFile(null)
      setCadastroFile(null)
      setContaAzulFile(null)
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
              Carregue arquivos CSV e XLSX para migrar dados legados para o sistema.
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

      <PacientesMigrationDashboard />
      <CirurgiasRealizadasDashboard />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        <Card className="border-sky-200 bg-sky-50/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-sky-600" /> Vendas Conta Azul
            </CardTitle>
            <CardDescription>Upload relatorio_vendas.xlsx</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="contaAzul">Arquivo XLSX/CSV</Label>
                <Input
                  id="contaAzul"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setContaAzulFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center text-sm text-sky-600 hover:text-sky-800 font-medium">
                  <Info className="w-4 h-4 mr-1" /> Importação Inteligente{' '}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md font-mono leading-relaxed">
                  Processamento em lote com tratamento de limite de taxa. Cria vendas e{' '}
                  <strong>contas a receber</strong> automaticamente. Resolve e cria pacientes por
                  CPF/CNPJ.
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" /> Cadastro Master
            </CardTitle>
            <CardDescription>Upload cadastro_vinci240526.xlsx ou .csv</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="cadastro">Arquivo XLSX/CSV</Label>
                <Input
                  id="cadastro"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setCadastroFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center text-sm text-rose-600 hover:text-rose-800 font-medium">
                  <Info className="w-4 h-4 mr-1" /> Colunas Esperadas{' '}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md font-mono leading-relaxed">
                  tipo, tipo_pessoa, nome, cpf_cnpj, inscricao_estadual, dt_aniversario, endereco,
                  numero, complemento, bairro, cep, cidade, fone_comercial, fone_celular, email
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 bg-cyan-50/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" /> Pacientes Mestre
            </CardTitle>
            <CardDescription>Upload pacientes mestre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="mestre">Arquivo CSV</Label>
                <Input
                  id="mestre"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setMestreFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                  <Info className="w-4 h-4 mr-1" /> Colunas Esperadas{' '}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md font-mono leading-relaxed">
                  patient_id, name, civil_name, birthdate, gender, cpf, rg, mobile_phone,
                  home_phone, email, address, number, complement, neighborhood, city, state,
                  zip_code, active, observation
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-200 bg-teal-50/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-teal-600" /> Agendamentos Mestre
            </CardTitle>
            <CardDescription>Upload agenda mestre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="mestreAgendamentos">Arquivo CSV</Label>
                <Input
                  id="mestreAgendamentos"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setMestreAgendamentosFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center text-sm text-teal-600 hover:text-teal-800 font-medium">
                  <Info className="w-4 h-4 mr-1" /> Colunas Esperadas{' '}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md font-mono leading-relaxed">
                  pk, patient_id, physician_id, physician_name, date, start_time, end_time,
                  procedure_pack, observation, date_added, updated_at
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Pessoas
            </CardTitle>
            <CardDescription>Upload pessoas.csv</CardDescription>
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
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Vendas Legado
            </CardTitle>
            <CardDescription>Upload propostas_comerciais.csv</CardDescription>
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
              <FileSpreadsheet className="w-5 h-5 text-purple-600" /> Financeiro
            </CardTitle>
            <CardDescription>Upload financeiro.csv</CardDescription>
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
              <FileSpreadsheet className="w-5 h-5 text-orange-600" /> Fluxo Pagto
            </CardTitle>
            <CardDescription>Upload fluxo_pagamentos.csv</CardDescription>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Acompanhamento
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-pink-600" /> Cirurgias
            </CardTitle>
            <CardDescription>Upload cirurgias_a_receber.csv</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="cirurgias">Arquivo CSV</Label>
                <Input
                  id="cirurgias"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCirurgiasFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 mb-4 border-t pt-8">
        <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5" />
          Zona de Perigo - Limpeza de Dados
        </h3>
        <Card className="border-red-200 bg-red-50/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-red-700">Limpar Dados de Vendas</CardTitle>
            <CardDescription>
              Apaga todos os registros de pagamentos (recebimentos), contas a receber e vendas em
              ordem para manter a integridade do banco. Use isso apenas se precisar reimportar as
              vendas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isWiping}>
                  {isWiping ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Apagando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" /> Limpar Dados de Vendas
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente todos os
                    registros de <strong>pagamentos</strong>, <strong>contas a receber</strong> e{' '}
                    <strong>vendas</strong> do banco de dados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleWipeVendas}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sim, apagar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {wipeResults && (
              <div className="mt-6 p-4 rounded-md border border-red-100 bg-white dark:bg-background shadow-sm animate-fade-in">
                <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Relatório de Limpeza
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between border-b border-red-100 dark:border-red-900/30 pb-1">
                    <span className="text-muted-foreground">Total de vendas apagadas:</span>
                    <span className="font-bold">{wipeResults.vendas}</span>
                  </li>
                  <li className="flex justify-between border-b border-red-100 dark:border-red-900/30 pb-1">
                    <span className="text-muted-foreground">
                      Total de contas a receber apagadas:
                    </span>
                    <span className="font-bold">{wipeResults.contas_receber}</span>
                  </li>
                  <li className="flex justify-between border-b border-red-100 dark:border-red-900/30 pb-1">
                    <span className="text-muted-foreground">Total de recebimentos apagados:</span>
                    <span className="font-bold">{wipeResults.pagamentos}</span>
                  </li>
                  <li className="flex justify-between pt-1 mt-2">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-bold text-green-600">{wipeResults.status}</span>
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t">
        <div className="w-full md:w-1/2">
          {importProgress && (
            <div className="p-4 border rounded-lg bg-muted/30 shadow-sm animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-sm text-foreground">{importProgress.status}</h4>
                <span className="text-xs text-muted-foreground font-mono">
                  {importProgress.total > 0
                    ? `${Math.round((importProgress.current / importProgress.total) * 100)}%`
                    : ''}
                </span>
              </div>
              <Progress
                value={
                  importProgress.total > 0
                    ? (importProgress.current / importProgress.total) * 100
                    : 0
                }
                className="h-2.5 bg-muted-foreground/20"
              />
              {importProgress.total > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {importProgress.current} de {importProgress.total} registros processados
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 w-full md:w-auto justify-end">
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
              (!pessoasFile &&
                !vendasFile &&
                !financeiroFile &&
                !fluxoFile &&
                !acompanhamentoFile &&
                !cirurgiasFile &&
                !mestreFile &&
                !mestreAgendamentosFile &&
                !cadastroFile &&
                !contaAzulFile)
            }
            className="w-full md:w-auto h-12 px-8 text-base shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando Lotes...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Processar Importação
              </>
            )}
          </Button>
        </div>
      </div>

      {results && (
        <Card className="mt-8 border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-900/50 animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-6 h-6" /> Relatório de Auditoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
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
              <div className="bg-white dark:bg-background border rounded-lg p-5 text-center shadow-sm">
                <div className="text-4xl font-bold text-pink-600">
                  {results.cirurgiasRealizadas}
                </div>
                <div className="text-sm font-medium text-muted-foreground mt-2">Cirurgias</div>
              </div>
            </div>

            {results.contaAzul.vendasImportadas > 0 && (
              <div className="mt-6 border border-sky-100 dark:border-sky-900/30 rounded-lg p-5 bg-sky-50/50 dark:bg-sky-900/10">
                <h4 className="font-semibold text-sky-700 dark:text-sky-400 mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" /> Resumo Vendas Conta Azul (Batch Processado)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-sky-600">
                      {results.contaAzul.vendasImportadas}
                    </div>
                    <div className="text-sm text-muted-foreground">Vendas Importadas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-sky-600">
                      {results.contaAzul.clientesLocalizados}
                    </div>
                    <div className="text-sm text-muted-foreground">Clientes Localizados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-sky-600">
                      {results.contaAzul.clientesNovos}
                    </div>
                    <div className="text-sm text-muted-foreground">Clientes Novos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-sky-600">
                      {results.contaAzul.contasReceberCriadas}
                    </div>
                    <div className="text-sm text-muted-foreground">Contas a Receber</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(results.contaAzul.valorTotalVendas)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {results.contaAzul.lotesProcessados}
                    </div>
                    <div className="text-sm text-muted-foreground">Lotes Sucesso</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-500">
                      {results.contaAzul.lotesComErro}
                    </div>
                    <div className="text-sm text-muted-foreground">Lotes com Erro</div>
                  </div>
                </div>
              </div>
            )}

            {results.cadastro.total > 0 && (
              <div className="mt-6 border border-rose-100 dark:border-rose-900/30 rounded-lg p-5 bg-rose-50/50 dark:bg-rose-900/10">
                <h4 className="font-semibold text-rose-700 dark:text-rose-400 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" /> Resumo do Cadastro Master
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-rose-600">{results.cadastro.total}</div>
                    <div className="text-sm text-muted-foreground">Total Importados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-rose-600">{results.cadastro.f}</div>
                    <div className="text-sm text-muted-foreground">Pessoas Físicas (F)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-rose-600">{results.cadastro.j}</div>
                    <div className="text-sm text-muted-foreground">Pessoas Jurídicas (J)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-rose-600">
                      {results.cadastro.cidades}
                    </div>
                    <div className="text-sm text-muted-foreground">Cidades Únicas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {results.cadastro.incompletos}
                    </div>
                    <div className="text-sm text-muted-foreground">Registros Incompletos</div>
                  </div>
                </div>
                {results.cadastro.successMsg && (
                  <div className="mt-4 text-sm font-medium text-green-700 bg-green-100 p-3 rounded flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {results.cadastro.successMsg}
                  </div>
                )}
              </div>
            )}

            {results.mestreAgendamentos.total > 0 && (
              <div className="mt-6 border border-teal-100 dark:border-teal-900/30 rounded-lg p-5 bg-teal-50/50 dark:bg-teal-900/10">
                <h4 className="font-semibold text-teal-700 dark:text-teal-400 mb-4 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" /> Resumo de Agendamentos (Mestre)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-teal-600">
                      {results.mestreAgendamentos.total}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Importados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-teal-600">
                      {results.mestreAgendamentos.concluido}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Concluído</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-teal-600">
                      {results.mestreAgendamentos.agendado}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Agendado</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-teal-600">
                      {results.mestreAgendamentos.medicosUnicos}
                    </div>
                    <div className="text-sm text-muted-foreground">Médicos Únicos</div>
                  </div>
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
