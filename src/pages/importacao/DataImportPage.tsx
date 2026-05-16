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
          As linhas dos arquivos CSV fornecidos (<strong>pessoas-0506d.csv</strong>,{' '}
          <strong>propostascomerciais-55450.csv</strong>, <strong>financeiro-fc2f0.csv</strong>)
          devem ser importadas diretamente no seu banco de dados conectado (Skip Cloud / PocketBase)
          através de scripts externos ou ferramentas administrativas, para que o aplicativo possa
          lê-las a partir de lá em tempo de execução.
          <br />
          <br />
          Se nenhum banco de dados estiver conectado ainda, instrua-se a conectar um através do
          botão de integração do backend (ícone de servidor) no cabeçalho antes que os dados possam
          ser injetados no aplicativo.
          <br />
          <br />
          <strong>Atenção:</strong> Os dados mockados (fictícios) de demonstração foram removidos
          através das migrações <code>0044</code> e <code>0045_remove_mock_users.js</code> para
          preparar o ambiente. Agora, utilize as ferramentas e o painel de administração do banco de
          dados para realizar a importação segura e relacional das linhas reais, seguindo as regras
          de negócio abaixo. A importação direta e estática no código não é permitida.
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
              <CardDescription>pessoas-0506d.csv</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p className="text-muted-foreground">
                Importe para a coleção <strong>pacientes</strong> mapeando as colunas:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs bg-muted/50 p-3 rounded-md">
                <li>nome, telefone, email</li>
                <li>endereco, numero, complemento</li>
                <li>bairro, cidade, estado, cep</li>
                <li>data_nascimento, genero</li>
              </ul>
              <div className="flex items-start gap-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded border border-yellow-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <div className="space-y-1">
                  <p>
                    <strong>Sanitização e Resolução de Identidade:</strong>
                  </p>
                  <p>
                    Antes de importar, converta <code>nome</code> para letras minúsculas (removendo
                    espaços extras) e remova todos os caracteres não-numéricos de{' '}
                    <code>telefone</code>.
                  </p>
                  <p>
                    <strong>Regra de Unicidade:</strong> Um paciente é único pela combinação desse{' '}
                    <code>nome</code> + <code>telefone</code> sanitizados. Se a chave já existir,
                    pule o registro.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Vendas & Propostas</CardTitle>
              <CardDescription>propostascomerciais-55450.csv</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p className="text-muted-foreground">
                Importe para a coleção <strong>vendas</strong> mapeando as colunas:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs bg-muted/50 p-3 rounded-md">
                <li>id_proposta (salvar em observacoes)</li>
                <li>data_proposta &rarr; data_venda</li>
                <li>valor_total, entrada_paga</li>
                <li>status, observacoes</li>
              </ul>
              <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-200">
                <Info className="w-4 h-4 shrink-0" />
                <div className="space-y-1">
                  <p>
                    <strong>Mapeamento Relacional:</strong> Buscar o ID do paciente cruzando{' '}
                    <code>nome_cliente</code> e <code>telefone_cliente</code> (usando a mesma regra
                    de sanitização de pacientes).
                  </p>
                  <p>
                    <strong>Ação em Falha:</strong> Se o paciente não for encontrado, a venda{' '}
                    <strong>não deve ser importada</strong>. O script deve registrar um aviso:{' '}
                    <em>
                      "Paciente [nome] [telefone] nao encontrado — proposta [id_proposta] nao
                      importada"
                    </em>
                    .
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Financeiro</CardTitle>
              <CardDescription>financeiro-fc2f0.csv</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p className="text-muted-foreground">
                Roteamento categorizado com base na coluna <code>tipo</code>:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs bg-muted/50 p-3 rounded-md">
                <li>
                  Se <strong>receita</strong>: Importar para <strong>faturas</strong>.
                </li>
                <li>
                  Se <strong>despesa</strong>: Importar para <strong>contas_pagar</strong>.
                </li>
              </ul>
              <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-200">
                <Info className="w-4 h-4 shrink-0" />
                <p>
                  Para Receitas, faça o lookup do <code>paciente_id</code> com a chave
                  nome+telefone. Para Despesas, salve o <code>nome_cliente</code> diretamente no
                  campo <code>fornecedor</code>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">6. Padrões e Relatório</CardTitle>
              <CardDescription>Regras Finais de Importação</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div className="space-y-2">
                <p>
                  <strong>Formatação de Dados:</strong>
                </p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>
                    Datas no formato <code>DD/MM/YYYY</code> devem ser devidamente convertidas para
                    o padrão do banco.
                  </li>
                  <li>
                    Valores monetários devem garantir 2 casas decimais (ex: <code>15000.00</code>).
                  </li>
                </ul>
              </div>
              <div className="space-y-2 pt-2">
                <p>
                  <strong>Relatório de Auditoria (Output do seu Script):</strong>
                </p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>Total de Pacientes importados vs Total de duplicatas ignoradas.</li>
                  <li>Total de Vendas importadas vs Total de falhas (paciente não encontrado).</li>
                  <li>Total de Faturas (Receitas) e Contas a Pagar (Despesas) importadas.</li>
                  <li>
                    Lista com os avisos específicos de falha de vínculo de paciente nas vendas.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
