migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('fluxo_pagamentos')

    try {
      app.findFirstRecordByData('fluxo_pagamentos', 'fornecedor', 'Exemplo Fornecedor Ltda')
      return
    } catch (_) {}

    const record = new Record(col)
    record.set('vencimento', '2025-12-01 12:00:00.000Z')
    record.set('valor', 1500.5)
    record.set('fornecedor', 'Exemplo Fornecedor Ltda')
    record.set('observacoes', 'Semente de teste gerada automaticamente')
    record.set('status', 'pendente')

    app.save(record)
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData(
        'fluxo_pagamentos',
        'fornecedor',
        'Exemplo Fornecedor Ltda',
      )
      app.delete(record)
    } catch (_) {}
  },
)
