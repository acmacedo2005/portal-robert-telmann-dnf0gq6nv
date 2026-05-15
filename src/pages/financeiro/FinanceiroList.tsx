import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DollarSign } from 'lucide-react'
import { FaturasTab } from './FaturasTab'
import { ContasPagarTab } from './ContasPagarTab'
import { RelatoriosTab } from './RelatoriosTab'

export default function FinanceiroList() {
  return (
    <div className="space-y-4 bg-background p-6 rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="text-primary" /> Dashboard Financeiro
        </h2>
      </div>

      <Tabs defaultValue="receber" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="receber" className="mt-6">
          <FaturasTab />
        </TabsContent>

        <TabsContent value="pagar" className="mt-6">
          <ContasPagarTab />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-6">
          <RelatoriosTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
