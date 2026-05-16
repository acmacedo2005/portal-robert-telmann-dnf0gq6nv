migrate(
  (app) => {
    const collection = new Collection({
      name: 'fluxo_pagamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'vencimento', type: 'date', required: true },
        { name: 'valor', type: 'number', required: true },
        { name: 'fornecedor', type: 'text', required: true },
        { name: 'observacoes', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'pago', 'vencido', 'cancelado'],
          required: true,
        },
        { name: 'data_pagto', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('fluxo_pagamentos')
    app.delete(collection)
  },
)
