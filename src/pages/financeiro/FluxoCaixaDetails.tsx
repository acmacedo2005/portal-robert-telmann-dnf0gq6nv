import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface FluxoCaixaDetailsProps {
  pagamentos: any[]
  despesas: any[]
  categorias: any[]
  formatCurrency: (val: number) => string
}

export function FluxoCaixaDetails({
  pagamentos,
  despesas,
  categorias,
  formatCurrency,
}: FluxoCaixaDetailsProps) {
  const [receitasSort, setReceitasSort] = useState('date-desc')
  const [despesasSort, setDespesasSort] = useState('date-desc')
  const [despesaCategoriaFilter, setDespesaCategoriaFilter] = useState('all')

  const sortItems = (items: any[], sortType: string, dateField: string, valueField: string) => {
    return [...items].sort((a, b) => {
      const aVal = a[valueField] || a.valor || 0
      const bVal = b[valueField] || b.valor || 0
      if (sortType === 'date-desc')
        return new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime()
      if (sortType === 'date-asc')
        return new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime()
      if (sortType === 'val-desc') return bVal - aVal
      if (sortType === 'val-asc') return aVal - bVal
      return 0
    })
  }

  const sortedPagamentos = useMemo(
    () => sortItems(pagamentos, receitasSort, 'data_pagamento', 'valor_pago'),
    [pagamentos, receitasSort],
  )

  const filteredDespesas = useMemo(() => {
    let filtered = despesas
    if (despesaCategoriaFilter !== 'all') {
      filtered = despesas.filter(
        (d) =>
          d.categoria === despesaCategoriaFilter ||
          d.expand?.categoria_id?.id === despesaCategoriaFilter,
      )
    }
    return sortItems(filtered, despesasSort, 'data_pagamento', 'valor_pago')
  }, [despesas, despesaCategoriaFilter, despesasSort])

  return (
    <Tabs defaultValue="receitas" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
        <TabsTrigger value="receitas">Receitas Detalhadas</TabsTrigger>
        <TabsTrigger value="despesas">Despesas Detalhadas</TabsTrigger>
      </TabsList>

      <TabsContent value="receitas" className="mt-4 space-y-4">
        <div className="flex justify-end">
          <Select value={receitasSort} onValueChange={setReceitasSort}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Mais Recentes</SelectItem>
              <SelectItem value="date-asc">Mais Antigas</SelectItem>
              <SelectItem value="val-desc">Maior Valor</SelectItem>
              <SelectItem value="val-asc">Menor Valor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Fatura (Ref)</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPagamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        Nenhuma receita encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPagamentos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.expand?.fatura_id?.expand?.paciente_id?.nome || 'Desconhecido'}
                        </TableCell>
                        <TableCell>#{p.fatura_id?.slice(-6)}</TableCell>
                        <TableCell>{format(new Date(p.data_pagamento), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <span className="capitalize px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {p.metodo?.replace('_', ' ') || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(p.valor_pago)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y">
              {sortedPagamentos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma receita encontrada.
                </div>
              ) : (
                sortedPagamentos.map((p) => (
                  <div key={p.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold">
                        {p.expand?.fatura_id?.expand?.paciente_id?.nome || 'Desconhecido'}
                      </span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(p.valor_pago)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>{format(new Date(p.data_pagamento), 'dd/MM/yyyy')}</span>
                      <span className="capitalize px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {p.metodo?.replace('_', ' ') || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="despesas" className="mt-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Select value={despesaCategoriaFilter} onValueChange={setDespesaCategoriaFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
              <SelectItem value="aluguel">Aluguel</SelectItem>
              <SelectItem value="fornecedores">Fornecedores</SelectItem>
              <SelectItem value="salarios">Salários</SelectItem>
              <SelectItem value="utilitarios">Utilitários</SelectItem>
              <SelectItem value="taxas_cartao">Taxas de Cartão</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>

          <Select value={despesasSort} onValueChange={setDespesasSort}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Mais Recentes</SelectItem>
              <SelectItem value="date-asc">Mais Antigas</SelectItem>
              <SelectItem value="val-desc">Maior Valor</SelectItem>
              <SelectItem value="val-asc">Menor Valor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDespesas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Nenhuma despesa encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDespesas.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.fornecedor}</TableCell>
                        <TableCell className="capitalize">
                          {d.expand?.categoria_id?.nome || d.categoria?.replace('_', ' ')}
                        </TableCell>
                        <TableCell>{format(new Date(d.data_pagamento), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(d.valor_pago || d.valor)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y">
              {filteredDespesas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma despesa encontrada.
                </div>
              ) : (
                filteredDespesas.map((d) => (
                  <div key={d.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold">{d.fornecedor}</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(d.valor_pago || d.valor)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>{format(new Date(d.data_pagamento), 'dd/MM/yyyy')}</span>
                      <span className="capitalize">
                        {d.expand?.categoria_id?.nome || d.categoria?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
