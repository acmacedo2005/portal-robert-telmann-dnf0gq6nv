routerAdd(
  'POST',
  '/backend/v1/import-financeiro-wipe',
  (e) => {
    $app.runInTransaction((txApp) => {
      // Limpa APENAS contas a pagar/recebimentos que foram criados associados a um lançamento financeiro
      txApp
        .db()
        .newQuery(
          "DELETE FROM contas_pagar WHERE lancamento_id != '' AND lancamento_id IS NOT NULL",
        )
        .execute()
      txApp
        .db()
        .newQuery(
          "DELETE FROM recebimentos WHERE lancamento_id != '' AND lancamento_id IS NOT NULL",
        )
        .execute()

      const col = txApp.findCollectionByNameOrId('lancamentos_financeiros')
      txApp.truncateCollection(col)
    })
    return e.json(200, {
      success: true,
      message: 'Dados financeiros corrompidos foram removidos com sucesso.',
    })
  },
  $apis.requireAuth(),
)
