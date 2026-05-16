import { useState, useRef } from 'react'
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
import { FileUp, Download, Loader2, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CsvValidatorDialogProps {
  pacientes: { nome: string; telefone?: string }[]
}

interface ValidationResult {
  nome: string
  telefone: string
  status: 'Duplicata' | 'Novo'
}

interface Metrics {
  csvTotal: number
  dbTotal: number
  duplicates: number
  news: number
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
    return res
  }

  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase())
  const nomeIdx = headers.findIndex((h) => h.includes('nome') || h === 'name')
  const telIdx = headers.findIndex(
    (h) => h.includes('telefone') || h.includes('celular') || h.includes('fone') || h === 'phone',
  )

  if (nomeIdx === -1 || telIdx === -1)
    throw new Error('O CSV deve conter colunas para "Nome" e "Telefone".')

  const data = []
  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i])
    const nome = row[nomeIdx]?.trim() || ''
    const telefone = row[telIdx]?.trim() || ''
    if (nome || telefone) data.push({ nome, telefone })
  }
  return data
}

const normName = (n: string) => n.toLowerCase().trim()
const normPhone = (p: string) => p.replace(/\D/g, '')

export function CsvValidatorDialog({ pacientes }: CsvValidatorDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<ValidationResult[] | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsAnalyzing(true)
    try {
      const text = await file.text()
      const parsed = parseCSV(text)
      const existingKeys = new Set(
        pacientes.map((p) => `${normName(p.nome)}|${normPhone(p.telefone || '')}`),
      )

      let duplicates = 0,
        news = 0
      const comparisonResults: ValidationResult[] = parsed.map((item) => {
        const key = `${normName(item.nome)}|${normPhone(item.telefone)}`
        const isDup = existingKeys.has(key)
        if (isDup) duplicates++
        else news++
        return { ...item, status: isDup ? 'Duplicata' : 'Novo' }
      })

      setResults(comparisonResults)
      setMetrics({ csvTotal: parsed.length, dbTotal: pacientes.length, duplicates, news })
      toast.success('Análise concluída com sucesso')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ler o arquivo CSV')
    } finally {
      setIsAnalyzing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const exportCSV = () => {
    if (!results) return
    const blob = new Blob(
      [
        [
          'Nome,Telefone,Status',
          ...results.map((r) => `"${r.nome}","${r.telefone}","${r.status}"`),
        ].join('\n'),
      ],
      { type: 'text/csv;charset=utf-8;' },
    )
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'relatorio_duplicidades.csv'
    link.click()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open)
          setTimeout(() => {
            setResults(null)
            setMetrics(null)
          }, 300)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileUp className="h-4 w-4" />
          Validar Duplicidade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Validar Duplicidade de Pacientes (Conta Azul)</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <Info className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="text-sm text-muted-foreground flex-1">
              Faça upload de um arquivo CSV contendo "Nome" e "Telefone". O sistema irá comparar com
              os pacientes atuais sem modificar o banco de dados.
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

          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm text-muted-foreground">Itens no CSV</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.csvTotal}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm text-muted-foreground">Pacientes Atuais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.dbTotal}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm text-muted-foreground">Duplicatas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">{metrics.duplicates}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm text-muted-foreground">Novos Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{metrics.news}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {results && (
            <div className="space-y-4 border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                <h3 className="font-semibold">Resultados</h3>
                <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
                  <Download className="h-4 w-4" /> Baixar (CSV)
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="w-[120px] text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.nome || '-'}</TableCell>
                        <TableCell>{r.telefone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              r.status === 'Duplicata'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-green-100 text-green-800'
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {results.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          Nenhum dado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
