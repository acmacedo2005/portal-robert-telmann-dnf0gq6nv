import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EquipeTab from './components/EquipeTab'
import CategoriasTab from './components/CategoriasTab'
import ServicosTab from './components/ServicosTab'
import ConfiguracoesTab from './components/ConfiguracoesTab'
import { CsvValidatorDialog } from '@/components/pacientes/CsvValidatorDialog'

export default function Parametrizacao() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
      <Tabs defaultValue="equipe" className="space-y-4">
        <TabsList className="bg-white dark:bg-zinc-900 border flex-wrap h-auto p-1">
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="categorias">Categorias Financeiras</TabsTrigger>
          <TabsTrigger value="servicos">Serviços / Procedimentos</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações Gerais</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
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
        <TabsContent value="integracoes">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-medium">Integração com Conta Azul</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Importe os contatos exportados do Conta Azul e mescle os dados cadastrais faltantes
                dos seus pacientes. O sistema fará um cruzamento por Nome e Telefone.
              </p>
            </div>
            <CsvValidatorDialog />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
