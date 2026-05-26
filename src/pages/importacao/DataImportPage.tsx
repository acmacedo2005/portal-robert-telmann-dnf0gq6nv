import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { CheckCircle2, PlayCircle } from 'lucide-react'

export default function DataImportPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)

  const handleSanitize = async () => {
    try {
      setLoading(true)
      const res = await pb.send('/backend/v1/sanitize-vendas', { method: 'POST' })
      setReport(res)
      toast({ title: 'Sucesso', description: res.message })
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Falha ao sanitizar dados.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-8">
      <h1 className="text-2xl font-bold">Importação e Sanitização</h1>

      <Card>
        <CardHeader>
          <CardTitle>Sanitizar Vendas (Migração de Dados)</CardTitle>
          <CardDescription>
            Ajusta os valores monetários das vendas, mapeia vendedores e tipos de serviço para o
            novo modelo relacional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSanitize} disabled={loading}>
            {loading ? (
              'Processando...'
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" /> Iniciar Sanitização
              </>
            )}
          </Button>

          {report && (
            <div className="mt-4 p-4 bg-green-50 text-green-900 border border-green-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-bold text-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                {report.message}
              </div>
              <ul className="list-disc pl-5">
                <li>
                  Vendas corrigidas: <strong>{report.corrected}</strong>
                </li>
                <li>
                  Vendedores criados/verificados: <strong>{report.uniqueSellersCreated}</strong>
                </li>
                <li>
                  Tipos de Serviço criados/verificados:{' '}
                  <strong>{report.uniqueServicesCreated}</strong>
                </li>
              </ul>
              <p className="text-sm mt-2">
                Os dados textuais foram convertidos para relacionamentos e valores numéricos
                sanitizados com sucesso.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
