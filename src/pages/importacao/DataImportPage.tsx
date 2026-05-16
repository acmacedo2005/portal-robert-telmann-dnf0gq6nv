import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle2, Download, Database, Loader2, XCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import {
  parseCSV,
  parseBrCurrency,
  parseBrDate,
  normName,
  normPhone,
  getField,
} from '@/lib/import-utils'

interface AuditRecord {
  type: string
  source: string
  status: 'Success' | 'Error'
  errorReason?: string
}

export default function DataImportPage() {
  const [files, setFiles] = useState({
    pessoas: null as File | null,
    propostas: null as File | null,
    produtos: null as File | null,
    financeiro: null as File | null,
    negociacoes: null as File | null,
  })

  const [isProcessing, setIsProcessing] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([])
  const [metrics, setMetrics] = useState({
    clientes: 0,
    propostas: 0,
    produtos: 0,
    financeiro: 0,
    negociacoes: 0,
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof files) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => ({ ...prev, [type]: e.target.files![0] }))
    }
  }

  const processImport = async () => {
    setIsProcessing(true)
    const newLogs: AuditRecord[] = []
    const newMetrics = { clientes: 0, propostas: 0, produtos: 0, financeiro: 0, negociacoes: 0 }

    try {
      const patients = await pb.collection('pacientes').getFullList({ requestKey: null })
      const patientMap = new Map()
      const patientNameMap = new Map()
      patients.forEach((p) => {
        patientMap.set(`${normName(p.nome)}|${normPhone(p.telefone || '')}`, p)
        patientNameMap.set(normName(p.nome), p)
      })

      const users = await pb.collection('users').getFullList({ requestKey: null })
      const userMap = new Map()
      users.forEach((u) => userMap.set(normName(u.name || u.nome || u.email), u.id))

      const getPatientId = (name: string, phone: string) => {
        let p = patientMap.get(`${normName(name)}|${normPhone(phone)}`)
        if (!p && name) p = patientNameMap.get(normName(name))
        return p?.id
      }

      if (files.pessoas) {
        const text = await files.pessoas.text()
        const data = parseCSV(text)
        for (const row of data) {
          const nome = getField(row, ['nome', 'contato', 'cliente'])
          const telefone = getField(row, ['telefone', 'celular'])
          const email = getField(row, ['email', 'e-mail'])
          const endereco = getField(row, ['endereco', 'rua', 'logradouro'])
          const cidade = getField(row, ['cidade', 'municipio'])
          const estado = getField(row, ['estado', 'uf'])

          if (!nome) continue
          const key = `${normName(nome)}|${normPhone(telefone)}`
          if (!patientMap.has(key)) {
            try {
              const newPac = await pb
                .collection('pacientes')
                .create({ nome, telefone, email, rua: endereco, cidade, estado })
              patientMap.set(key, newPac)
              patientNameMap.set(normName(nome), newPac)
              newMetrics.clientes++
              newLogs.push({ type: 'Cliente', source: nome, status: 'Success' })
            } catch (e: any) {
              newLogs.push({
                type: 'Cliente',
                source: nome,
                status: 'Error',
                errorReason: e.message,
              })
            }
          } else {
            newLogs.push({
              type: 'Cliente',
              source: nome,
              status: 'Error',
              errorReason: 'Duplicata encontrada (Ignorado)',
            })
          }
        }
      }

      if (files.propostas) {
        const text = await files.propostas.text()
        const data = parseCSV(text)
        for (const row of data) {
          const contato = getField(row, ['contato', 'cliente', 'nome'])
          const pId = getPatientId(contato, getField(row, ['telefone']))
          if (!pId) {
            newLogs.push({
              type: 'Proposta',
              source: contato,
              status: 'Error',
              errorReason: 'Paciente não encontrado',
            })
            continue
          }
          const vTotal = parseBrCurrency(getField(row, ['valor total', 'total', 'valor']))
          const vPago = parseBrCurrency(getField(row, ['valor', 'entrada']))
          const vendedorName = getField(row, ['vendedor', 'usuario', 'responsavel'])
          try {
            await pb.collection('vendas').create({
              paciente_id: pId,
              tipo: 'cirurgia_tratamento',
              valor_total: vTotal,
              valor_final: vTotal,
              entrada_paga: vPago,
              saldo_restante: vTotal - vPago,
              status: 'paga',
              data_venda:
                parseBrDate(getField(row, ['data orcamento', 'data', 'criado'])) ||
                new Date().toISOString(),
              observacoes: getField(row, ['observacao', 'obs']),
              vendedor_id: vendedorName ? userMap.get(normName(vendedorName)) : null,
            })
            newMetrics.propostas++
            newLogs.push({ type: 'Proposta', source: contato, status: 'Success' })
          } catch (e: any) {
            newLogs.push({
              type: 'Proposta',
              source: contato,
              status: 'Error',
              errorReason: e.message,
            })
          }
        }
      }

      if (files.produtos) {
        const text = await files.produtos.text()
        const data = parseCSV(text)
        for (const row of data) {
          const nome = getField(row, ['nome', 'produto'])
          if (!nome) continue
          try {
            await pb.collection('servicos').create({
              nome,
              descricao: getField(row, ['descricao', 'detalhe']),
              valor_padrao: parseBrCurrency(getField(row, ['valor', 'preco'])),
              ativo: true,
            })
            newMetrics.produtos++
            newLogs.push({ type: 'Produto', source: nome, status: 'Success' })
          } catch (e: any) {
            newLogs.push({ type: 'Produto', source: nome, status: 'Error', errorReason: e.message })
          }
        }
      }

      if (files.financeiro) {
        const text = await files.financeiro.text()
        const data = parseCSV(text)
        for (const row of data) {
          const desc = getField(row, ['descricao', 'detalhe', 'titulo'])
          const fornec = getField(row, ['contato', 'fornecedor', 'cliente'])
          if (!desc && !fornec) continue
          const tipo = getField(row, ['tipo', 'categoria']).toLowerCase()
          const cat = tipo.includes('receita')
            ? 'faturas'
            : tipo.includes('despesa')
              ? 'contas_pagar'
              : 'outros'
          const dVenc = parseBrDate(getField(row, ['data prazo entrega', 'vencimento', 'prazo']))
          try {
            await pb.collection('contas_pagar').create({
              descricao: desc,
              fornecedor: fornec,
              valor: parseBrCurrency(getField(row, ['valor', 'total'])),
              categoria: cat,
              status: 'paga',
              data_vencimento: dVenc || new Date().toISOString(),
              data_pagamento:
                parseBrDate(getField(row, ['data orcamento', 'pagamento', 'baixa'])) ||
                dVenc ||
                new Date().toISOString(),
            })
            newMetrics.financeiro++
            newLogs.push({ type: 'Financeiro', source: desc || fornec, status: 'Success' })
          } catch (e: any) {
            newLogs.push({
              type: 'Financeiro',
              source: desc || fornec,
              status: 'Error',
              errorReason: e.message,
            })
          }
        }
      }

      if (files.negociacoes) {
        const text = await files.negociacoes.text()
        const data = parseCSV(text)
        for (const row of data) {
          const contato = getField(row, ['contato', 'cliente', 'nome'])
          const pId = getPatientId(contato, '')
          if (!pId) {
            newLogs.push({
              type: 'Negociação',
              source: contato,
              status: 'Error',
              errorReason: 'Paciente não encontrado',
            })
            continue
          }
          try {
            await pb.collection('observacoes_paciente').create({
              paciente_id: pId,
              observacao: getField(row, ['historico', 'negociacao', 'observacao']),
              data:
                parseBrDate(getField(row, ['data orcamento', 'data', 'criado'])) ||
                new Date().toISOString(),
            })
            newMetrics.negociacoes++
            newLogs.push({ type: 'Negociação', source: contato, status: 'Success' })
          } catch (e: any) {
            newLogs.push({
              type: 'Negociação',
              source: contato,
              status: 'Error',
              errorReason: e.message,
            })
          }
        }
      }

      setAuditLogs(newLogs)
      setMetrics(newMetrics)
      toast.success('Processo de importação finalizado.')
    } catch (err: any) {
      toast.error('Erro na importação: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const exportAuditCSV = () => {
    const csv = [
      'Tipo,Origem,Status,Detalhe',
      ...auditLogs.map((l) => `"${l.type}","${l.source}","${l.status}","${l.errorReason || ''}"`),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'relatorio_importacao.csv'
    link.click()
  }

  const FileSelector = ({
    label,
    desc,
    type,
  }: {
    label: string
    desc: string
    type: keyof typeof files
  }) => (
    <div className="flex flex-col space-y-2 border p-4 rounded-lg bg-card">
      <Label className="font-semibold text-base">{label}</Label>
      <p className="text-xs text-muted-foreground mb-2">{desc}</p>
      <Input
        type="file"
        accept=".csv"
        onChange={(e) => handleFileChange(e, type)}
        disabled={isProcessing}
      />
    </div>
  )

  const totalImported = Object.values(metrics).reduce((a, b) => a + b, 0)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importação de Dados (Legado)</h1>
          <p className="text-muted-foreground mt-2">
            Migre informações do Conta Azul e iClinic para a nova plataforma.
          </p>
        </div>
        <Database className="h-10 w-10 text-muted-foreground opacity-50" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arquivos para Importação</CardTitle>
          <CardDescription>
            Selecione os arquivos CSV extraídos do seu sistema legado. Você pode processar todos de
            uma vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FileSelector
              label="1. Clientes Novos (pessoas.csv)"
              desc="Importa contatos que não são duplicatas"
              type="pessoas"
            />
            <FileSelector
              label="2. Propostas (propostas_comerciais.csv)"
              desc="Cria vendas e vincula a pacientes"
              type="propostas"
            />
            <FileSelector
              label="3. Produtos (produtos.csv)"
              desc="Alimenta o catálogo de serviços"
              type="produtos"
            />
            <FileSelector
              label="4. Financeiro (financeiro.csv)"
              desc="Migra histórico de receitas e despesas"
              type="financeiro"
            />
            <FileSelector
              label="5. Negociações (negociacoes.csv)"
              desc="Cria histórico de observações de pacientes"
              type="negociacoes"
            />
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={processImport}
              disabled={isProcessing || Object.values(files).every((f) => f === null)}
              size="lg"
              className="w-full md:w-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processando...
                </>
              ) : (
                'Iniciar Importação em Lote'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {auditLogs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Painel de Auditoria</CardTitle>
              <CardDescription>Resumo do processamento de dados</CardDescription>
            </div>
            <Button onClick={exportAuditCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> Baixar Relatório (CSV)
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold">{metrics.clientes}</div>
                <div className="text-xs text-muted-foreground mt-1">Clientes</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold">{metrics.propostas}</div>
                <div className="text-xs text-muted-foreground mt-1">Propostas</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold">{metrics.produtos}</div>
                <div className="text-xs text-muted-foreground mt-1">Produtos</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold">{metrics.financeiro}</div>
                <div className="text-xs text-muted-foreground mt-1">Financeiro</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold">{metrics.negociacoes}</div>
                <div className="text-xs text-muted-foreground mt-1">Negociações</div>
              </div>
              <div className="p-4 bg-primary/10 text-primary border-primary/20 border rounded-lg text-center">
                <div className="text-2xl font-bold">{totalImported}</div>
                <div className="text-xs mt-1 font-medium">TOTAL GERAL</div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader className="bg-muted sticky top-0">
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Registro Origem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhe (Erros)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{log.type}</TableCell>
                        <TableCell>{log.source}</TableCell>
                        <TableCell>
                          {log.status === 'Success' ? (
                            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Sucesso
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" /> Erro
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.errorReason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
