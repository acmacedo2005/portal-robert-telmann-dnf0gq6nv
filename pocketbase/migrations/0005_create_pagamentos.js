migrate(
  (app) => {
    const faturas = app.findCollectionByNameOrId('faturas')

    const pagamentos = new Collection({
      name: 'pagamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        {
          name: 'fatura_id',
          type: 'relation',
          required: true,
          collectionId: faturas.id,
          maxSelect: 1,
        },
        { name: 'valor_pago', type: 'number', required: true },
        { name: 'data_pagamento', type: 'date', required: true },
        { name: 'metodo', type: 'select', values: ['cartao', 'dinheiro', 'transferencia'] },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(pagamentos)
  },
  (app) => {
    const pagamentos = app.findCollectionByNameOrId('pagamentos')
    app.delete(pagamentos)
  },
)
