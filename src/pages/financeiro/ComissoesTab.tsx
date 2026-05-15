import { useEffect, useState } from 'react'
import { getComissoes, updateComissao } from '@/services/comissoes_vendedor'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Check, Frown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

export function ComissoesTab() {
  const [comissoes, setComissoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchComissoes = async () => {
    try {
      setLoading(true)
      const data = await getComissoes()
      setComissoes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComissoes()
  }, [])
  useRealtime('comissoes_vendedor', fetchComissoes)

  const totalComissoes = comissoes.reduce((acc, c) => acc + c.valor_comissao, 0)
  const pendentes = comissoes
    .filter((c) => c.status === 'pendente')
    .reduce((acc, c) => acc + c.valor_comissao, 0)
  const pagas = comissoes
    .filter((c) => c.status === 'paga')
    .reduce((acc, c) => acc + c.valor_comissao, 0)

  const handlePagar = async (id: string) => {
    try {
      await updateComissao(id, { status: 'paga' })
      toast({ title: 'Comissão marcada como paga!' })
      fetchComissoes()
    } catch (e) {
      toast({ title: 'Erro ao atualizar comissão', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <p className="text-sm font-bold text-zinc-500 uppercase">Total Comissões</p>
          <p className="text-2xl font-black">{formatCurrency(totalComissoes)}</p>
        </Card>
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/50">
          <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500 uppercase">
            Pendentes
          </p>
          <p className="text-2xl font-black text-yellow-700 dark:text-yellow-400">
            {formatCurrency(pendentes)}
          </p>
        </Card>
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50">
          <p className="text-sm font-bold text-green-600 dark:text-green-500 uppercase">Pagas</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-400">
            {formatCurrency(pagas)}
          </p>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-[60px] w-full rounded-md" />
          <Skeleton className="h-[60px] w-full rounded-md" />
        </div>
      ) : comissoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-zinc-500 border-2 border-dashed rounded-lg">
          <Frown className="w-12 h-12 mb-4 text-zinc-400" />
          <p className="text-lg font-bold">Nenhuma comissão encontrada</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead className="font-bold">Vendedor</TableHead>
                <TableHead className="font-bold">Paciente (Venda)</TableHead>
                <TableHead className="font-bold">Data</TableHead>
                <TableHead className="text-right font-bold">%</TableHead>
                <TableHead className="text-right font-bold">Valor</TableHead>
                <TableHead className="text-center font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comissoes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold">
                    {c.expand?.vendedor_id?.name || 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium text-zinc-600">
                    {c.expand?.venda_id?.expand?.paciente_id?.nome || 'N/A'}
                  </TableCell>
                  <TableCell>{format(new Date(c.data_calculo), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-right">{c.percentual_comissao}%</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {formatCurrency(c.valor_comissao)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        c.status === 'paga'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {c.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status === 'pendente' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => handlePagar(c.id)}
                      >
                        <Check className="w-4 h-4 mr-1" /> Pagar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
