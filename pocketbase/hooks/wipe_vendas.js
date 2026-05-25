routerAdd(
  'POST',
  '/backend/v1/import/wipe-vendas',
  (e) => {
    // Ordem exata conforme critérios de aceite:
    // 1. pagamentos (recebimentos)
    // 2. contas_receber
    // 3. vendas
    const collections = ['pagamentos', 'contas_receber', 'vendas']

    try {
      $app.runInTransaction((txApp) => {
        for (const collName of collections) {
          const col = txApp.findCollectionByNameOrId(collName)
          txApp.truncateCollection(col)
        }
      })
      return e.json(200, { success: true })
    } catch (err) {
      $app.logger().error('Erro ao limpar dados de vendas', 'erro', err.message)
      return e.internalServerError('Erro ao limpar dados de vendas: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
