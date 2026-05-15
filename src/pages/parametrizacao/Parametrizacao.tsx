import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EquipeTab from './components/EquipeTab'
import CategoriasTab from './components/CategoriasTab'
import ServicosTab from './components/ServicosTab'
import ConfiguracoesTab from './components/ConfiguracoesTab'

export default function Parametrizacao() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
      <Tabs defaultValue="equipe" className="space-y-4">
        <TabsList className="bg-white dark:bg-zinc-900 border">
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="categorias">Categorias Financeiras</TabsTrigger>
          <TabsTrigger value="servicos">Serviços / Procedimentos</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações Gerais</TabsTrigger>
        </TabsList>
        <TabsContent value="equipe">
          <EquipeTab />
        </TabsContent>
        <TabsContent value="categorias">
          <CategoriasTab />
        </TabsContent>
        <TabsContent value="servicos">
          <ServicosTab />
        </TabsContent>
        <TabsContent value="configuracoes">
          <ConfiguracoesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
