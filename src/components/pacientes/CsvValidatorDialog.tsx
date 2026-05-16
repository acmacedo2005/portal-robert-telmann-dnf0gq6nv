import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { FileUp, Download, Loader2, Info, Merge, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPacientes, updatePaciente } from '@/services/pacientes'
import type { RecordModel } from 'pocketbase'

interface CsvValidatorDialogProps {
  pacientes?: any[] // Opcional, para compatibilidade caso seja usado em outros locais
}

interface ValidationResult {
  csvData: any
  dbRecord?: RecordModel
  status: 'Novo' | 'Mesclavel' | 'Sem_Alteracao'
  fieldsToUpdate: string[]
  updatePayload: any
}

interface Metrics {
  csvTotal: number
  dbTotal: number
  duplicates: number
  news: number
  mergeable: number
  unchanged: number
}

interface AuditLog {
  nome: string
  telefone: string
  camposAtualizados: string
  statusSucedido: 'Sim' | 'Não'
  erroDetalhe: string
}

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) throw new Error('CSV vazio ou sem dados válidos')

  const separator = lines[0].includes(';') ? ';' : ','
  const parseLine = (line: string) => {
    const res = []
    let cur = '',
      inQuotes = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes
      else if (line[i] === separator && !inQuotes) {
        res.push(cur)
        cur = ''
      } else cur += line[i]
    }
    res.push(cur)
    return res.map((c) => c.replace(/^"|"$/g, '').trim())
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase())
  const getIdx = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)))

  const nomeIdx = getIdx(['nome', 'name'])
  const telIdx = getIdx(['telefone', 'celular', 'fone', 'phone'])

  if (nomeIdx === -1 || telIdx === -1)
    throw new Error('O CSV deve conter colunas para "Nome" e "Telefone".')

  const emailIdx = getIdx(['email', 'e-mail'])
  const enderecoIdx = getIdx(['endereço', 'endereco', 'logradouro'])
  const ruaIdx = getIdx(['rua'])
  const numeroIdx = getIdx(['numero', 'número'])
  const complIdx = getIdx(['complemento'])
  const cepIdx = getIdx(['cep'])
  const cidadeIdx = getIdx(['cidade', 'municipio'])
  const estadoIdx = getIdx(['estado', 'uf'])

  const data = []
  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i])
    const nome = row[nomeIdx] || ''
    const telefone = row[telIdx] || ''
    if (!nome && !telefone) continue

    data.push({
      nome,
      telefone,
      email: emailIdx >= 0 ? row[emailIdx] : '',
      endereco: enderecoIdx >= 0 ? row[enderecoIdx] : '',
      rua: ruaIdx >= 0 ? row[ruaIdx] : '',
      numero: numeroIdx >= 0 ? row[numeroIdx] : '',
      complemento: complIdx >= 0 ? row[complIdx] : '',
      cep: cepIdx >= 0 ? row[cepIdx] : '',
      cidade: cidadeIdx >= 0 ? row[cidadeIdx] : '',
      estado: estadoIdx >= 0 ? row[estadoIdx] : '',
    })
  }
  return data
}

const normName = (n: string) => n.toLowerCase().trim()
const normPhone = (p: string) => p.replace(/\D/g, '')

export function CsvValidatorDialog({ pacientes: _ignored }: CsvValidatorDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isMerging, setIsMerging] = useState(false)

  const [dbPacientes, setDbPacientes] = useState<RecordModel[]>([])
  const [results, setResults] = useState<ValidationResult[] | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[] | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      getPacientes().then(setDbPacientes).catch(console.error)
    }
  }, [isOpen])

  const reset = () => {
    setResults(null)
    setMetrics(null)
    setAuditLogs(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsAnalyzing(true)
    try {
      const text = await file.text()
      const parsed = parseCSV(text)

      let currentDb = dbPacientes
      if (currentDb.length === 0) {
        currentDb = await getPacientes()
        setDbPacientes(currentDb)
      }

      const existingMap = new Map<string, RecordModel>()
      currentDb.forEach((p) => {
        const key = `${normName(p.nome)}|${normPhone(p.telefone || '')}`
        existingMap.set(key, p)
      })

      let duplicates = 0,
        news = 0,
        mergeable = 0,
        unchanged = 0

      const comparisonResults: ValidationResult[] = parsed.map((item) => {
        const key = `${normName(item.nome)}|${normPhone(item.telefone)}`
        const dbRecord = existingMap.get(key)

        if (!dbRecord) {
          news++
          return { csvData: item, status: 'Novo', fieldsToUpdate: [], updatePayload: {} }
        }

        duplicates++
        const fieldsToCheck = [
          'email',
          'endereco',
          'rua',
          'numero',
          'complemento',
          'cep',
          'cidade',
          'estado',
        ] as const
        const fieldsToUpdate: string[] = []
        const updatePayload: any = {}

        fieldsToCheck.forEach((field) => {
          const csvVal = item[field]
          const dbVal = dbRecord[field]
          if (csvVal && (!dbVal || dbVal.trim() === '')) {
            fieldsToUpdate.push(field)
            updatePayload[field] = csvVal
          }
        })

        if (fieldsToUpdate.length > 0) {
          mergeable++
          return { csvData: item, dbRecord, status: 'Mesclavel', fieldsToUpdate, updatePayload }
        } else {
          unchanged++
          return {
            csvData: item,
            dbRecord,
            status: 'Sem_Alteracao',
            fieldsToUpdate: [],
            updatePayload: {},
          }
        }
      })

      setResults(comparisonResults)
      setMetrics({
        csvTotal: parsed.length,
        dbTotal: currentDb.length,
        duplicates,
        news,
        mergeable,
        unchanged,
      })
      toast.success('Análise concluída com sucesso')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ler o arquivo CSV')
    } finally {
      setIsAnalyzing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleMerge = async () => {
    if (!results) return
    const mergeables = results.filter((r) => r.status === 'Mesclavel')
    if (mergeables.length === 0) return

    setIsMerging(true)
    const logs: AuditLog[] = []
    let successCount = 0

    for (const item of mergeables) {
      try {
        await updatePaciente(item.dbRecord!.id, item.updatePayload)
        logs.push({
          nome: item.csvData.nome,
          telefone: item.csvData.telefone,
          camposAtualizados: item.fieldsToUpdate.join(', '),
          statusSucedido: 'Sim',
          erroDetalhe: '-',
        })
        successCount++
      } catch (err: any) {
        logs.push({
          nome: item.csvData.nome,
          telefone: item.csvData.telefone,
          camposAtualizados: item.fieldsToUpdate.join(', '),
          statusSucedido: 'Não',
          erroDetalhe: err.message || 'Erro ao atualizar',
        })
      }
    }

    setAuditLogs(logs)
    setIsMerging(false)
    toast.success(`Mesclagem concluída! ${successCount} pacientes atualizados.`)

    // Atualiza a lista local de DB para evitar re-mesclagem acidental
    getPacientes().then(setDbPacientes).catch(console.error)
  }

  const exportValidationCSV = () => {
    if (!results) return
    const blob = new Blob(
      [
        [
          'Nome,Telefone,Status,Campos_Atualizaveis',
          ...results.map(
            (r) =>
              `"${r.csvData.nome}","${r.csvData.telefone}","${r.status}","${r.fieldsToUpdate.join('; ')}"`,
          ),
        ].join('\n'),
      ],
      { type: 'text/csv;charset=utf-8;' },
    )
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'analise_duplicidades.csv'
    link.click()
  }

  const exportAuditCSV = () => {
    if (!auditLogs) return
    const blob = new Blob(
      [
        [
          'Nome,Telefone,Campos_Atualizados,Status_Sucedido,Erro_Detalhe',
          ...auditLogs.map(
            (l) =>
              `"${l.nome}","${l.telefone}","${l.camposAtualizados}","${l.statusSucedido}","${l.erroDetalhe}"`,
          ),
        ].join('\n'),
      ],
      { type: 'text/csv;charset=utf-8;' },
    )
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'auditoria_mesclagem.csv'
    link.click()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) setTimeout(reset, 300)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileUp className="h-4 w-4" />
          Importar / Mesclar (Conta Azul)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Integração de Dados (Conta Azul)</DialogTitle>
        </DialogHeader>

        {!results && !auditLogs && (
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
              <Info className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="text-sm text-muted-foreground flex-1">
                <p className="mb-2">
                  Faça upload de um arquivo CSV exportado do Conta Azul. O sistema cruzará os dados
                  por <strong>Nome</strong> e <strong>Telefone</strong>.
                </p>
                <p>
                  <strong>Regras:</strong> Os campos Telefone e Data de Nascimento do iClinic nunca
                  serão sobrescritos. Endereço, Email, Cidade e CEP só serão atualizados se
                  estiverem vazios no banco de dados.
                </p>
              </div>
              <div>
                <Input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileUp className="h-4 w-4 mr-2" />
                  )}
                  {isAnalyzing ? 'Analisando...' : 'Selecionar CSV'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {results && !auditLogs && metrics && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-4 py-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm text-muted-foreground">Itens no CSV</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.csvTotal}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm text-muted-foreground">Novos Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{metrics.news}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm text-blue-700 dark:text-blue-300">
                    Duplicatas Mescláveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {metrics.mergeable}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm text-muted-foreground">
                    Duplicatas Sem Alteração
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">{metrics.unchanged}</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b bg-muted/20 shrink-0">
                <h3 className="font-semibold">Resultados da Análise</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportValidationCSV}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" /> Baixar (CSV)
                  </Button>
                  {metrics.mergeable > 0 && (
                    <Button onClick={handleMerge} disabled={isMerging} className="gap-2">
                      {isMerging ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Merge className="h-4 w-4" />
                      )}
                      Confirmar Mesclagem ({metrics.mergeable})
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Campos a Atualizar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.csvData.nome || '-'}</TableCell>
                        <TableCell>{r.csvData.telefone || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              r.status === 'Mesclavel'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : r.status === 'Sem_Alteracao'
                                  ? 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-200'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }
                          >
                            {r.status === 'Mesclavel'
                              ? 'Mesclável'
                              : r.status === 'Sem_Alteracao'
                                ? 'Duplicata Exata'
                                : 'Novo Cliente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.fieldsToUpdate.length > 0 ? r.fieldsToUpdate.join(', ') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {results.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          Nenhum dado encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        )}

        {auditLogs && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-4 py-2">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 shrink-0">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Relatório de Mesclagem
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {auditLogs.filter((l) => l.statusSucedido === 'Sim').length} registros
                    atualizados com sucesso.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>
                  Nova Importação
                </Button>
                <Button onClick={exportAuditCSV} className="gap-2">
                  <Download className="h-4 w-4" /> Baixar Relatório (CSV)
                </Button>
              </div>
            </div>

            <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Campos Atualizados</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhes do Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{log.nome || '-'}</TableCell>
                        <TableCell>{log.telefone || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.camposAtualizados || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.statusSucedido === 'Sim' ? 'default' : 'destructive'}>
                            {log.statusSucedido === 'Sim' ? 'Sucesso' : 'Erro'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-red-500 text-xs">{log.erroDetalhe}</TableCell>
                      </TableRow>
                    ))}
                    {auditLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          Nenhuma mesclagem foi processada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
