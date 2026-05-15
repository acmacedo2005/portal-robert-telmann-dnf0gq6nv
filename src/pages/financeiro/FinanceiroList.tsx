import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DollarSign } from 'lucide-react'
import { FaturasTab } from './FaturasTab'
import { ContasPagarTab } from './ContasPagarTab'

export default function FinanceiroList() {
  return (
    <div className="space-y-4 bg-background p-6 rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="text-primary" /> Dashboard Financeiro
        </h2>
      </div>

      <Tabs defaultValue="pagar" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
        </TabsList>

        <TabsContent value="pagar" className="mt-6">
          <ContasPagarTab />
        </TabsContent>

        <TabsContent value="receber" className="mt-6">
          <FaturasTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
