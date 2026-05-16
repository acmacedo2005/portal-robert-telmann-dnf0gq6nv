import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Database, Info, Server, AlertTriangle } from 'lucide-react'

export default function DataImportPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in p-6">
      <div className="flex items-center gap-3 mb-8">
        <Database className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Importação de Dados Reais</h1>
      </div>

      <Alert
        variant="destructive"
        className="bg-destructive/10 border-destructive/20 text-destructive"
      >
        <Server className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">
          Integração de Banco de Dados Necessária
        </AlertTitle>
        <AlertDescription className="mt-2 text-base leading-relaxed">
          As linhas dos arquivos CSV fornecidos (<strong>produtos.csv</strong>,{' '}
          <strong>negociacoes.csv</strong>, <strong>pessoas-d11a9.csv</strong>,{' '}
          <strong>propostascomerciais-b63af.csv</strong>, <strong>financeiro-d4d87.csv</strong>)
          devem ser importadas diretamente no seu banco de dados conectado (Skip Cloud / PocketBase)
          para que o aplicativo possa lê-las a partir de lá em tempo de execução.
          <br />
          <br />
          Se nenhum banco de dados estiver conectado ainda, instrua-se a conectar um através do
          botão de integração do backend (ícone de servidor) no cabeçalho antes que os dados possam
          ser injetados no aplicativo.
          <br />
          <br />
          <strong>Atenção:</strong> Os dados mockados (fictícios) de demonstração foram removidos
          através da migração <code>0044_delete_mock_data.js</code> para preparar o ambiente. Agora,
          utilize as ferramentas e o painel de administração do banco de dados para realizar a
          importação segura e relacional das linhas reais. A importação direta e estática no código
          não é permitida.
        </AlertDescription>
      </Alert>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-500" /> Esquemas de Importação e Mapeamento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Serviços</CardTitle>
              <CardDescription>produtos.csv</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p className="text-muted-foreground">
                Importe para a coleção <strong>servicos</strong> mapeando as colunas:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs bg-muted/50 p-3 rounded-md">
                <li>nome</li>
                <li>descricao</li>
                <li>valor_padrao</li>
                <li>ativo ("sim" &rarr; true)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Observações (Negociações)</CardTitle>
              <CardDescription>negociacoes.csv</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p className="text-muted-foreground">
                Importe para a coleção <strong>observacoes_paciente</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs bg-muted/50 p-3 rounded-md">
                <li>nome_cliente, telefone_cliente &rarr; paciente_id (lookup)</li>
                <li>data_negociacao (DD/MM/YYYY) &rarr; data</li>
                <li>
                  tipo_contato, historico, observacoes, proxima_acao &rarr; observacao
                  (concatenados)
                </li>
              </ul>
              <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-200">
                <Info className="w-4 h-4 shrink-0" />
                <p>
                  Busque o <code>paciente_id</code> correspondente ou registre em relatório as
                  linhas sem paciente.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Pacientes</CardTitle>
              <CardDescription>pessoas-d11a9.csv</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p className="text-muted-foreground">
                Importe para a coleção <strong>pacientes</strong> mapeando as colunas:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs bg-muted/50 p-3 rounded-md">
                <li>nome, telefone, email</li>
                <li>endereco, numero, complemento</li>
                <li>bairro, cidade, estado, cep</li>
                <li>data_nascimento (YYYY-MM-DD)</li>
                <li>genero</li>
              </ul>
              <div className="flex items-start gap-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded border border-yellow-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p>
                  <strong>Restrição:</strong> Garanta que não existam duplicatas baseadas na
                  combinação exata de Nome + Telefone.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Vendas & Propostas</CardTitle>
              <CardDescription>propostascomerciais-b63af.csv</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p className="text-muted-foreground">
                Importe para a coleção <strong>vendas</strong> mapeando as colunas:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs bg-muted/50 p-3 rounded-md">
                <li>id_proposta (como referência)</li>
                <li>data_proposta &rarr; data_venda</li>
                <li>valor_total, entrada_paga</li>
                <li>status, observacoes</li>
              </ul>
              <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-200">
                <Info className="w-4 h-4 shrink-0" />
                <p>
                  <strong>Relacional:</strong> O sistema de importação do DB deve buscar o ID do
                  paciente usando o <code>nome_cliente</code> e <code>telefone_cliente</code> do CSV
                  para preencher <code>paciente_id</code>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Financeiro</CardTitle>
              <CardDescription>financeiro-d4d87.csv</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p className="text-muted-foreground">
                Filtre pelo campo <code>tipo</code> e importe para <strong>faturas</strong>{' '}
                (receitas) ou <strong>contas_pagar</strong> (despesas):
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs bg-muted/50 p-3 rounded-md">
                <li>tipo (Usar como filtro)</li>
                <li>nome_cliente (paciente_id / fornecedor)</li>
                <li>descricao, valor</li>
                <li>data_vencimento, data_pagamento</li>
                <li>status, categoria</li>
              </ul>
              <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-200">
                <Info className="w-4 h-4 shrink-0" />
                <p>
                  Receitas tornam-se Faturas (lookup de paciente obrigatório), Despesas tornam-se
                  Contas a Pagar (<code>nome_cliente</code> vai para <code>fornecedor</code>).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
