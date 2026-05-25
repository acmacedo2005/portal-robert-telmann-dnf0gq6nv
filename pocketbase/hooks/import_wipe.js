routerAdd(
  'POST',
  '/backend/v1/import/wipe',
  (e) => {
    const collections = [
      'observacoes_paciente',
      'arquivos_paciente',
      'saldo_tratamentos',
      'faturas',
      'agendamentos',
      'contas_pagar',
      'pacientes',
    ]

    $app.runInTransaction((txApp) => {
      for (const collName of collections) {
        try {
          const col = txApp.findCollectionByNameOrId(collName)
          txApp.truncateCollection(col)
        } catch (err) {
          $app
            .logger()
            .error('Erro ao truncar collection', 'collection', collName, 'erro', err.message)
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
