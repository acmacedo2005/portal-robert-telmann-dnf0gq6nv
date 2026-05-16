migrate(
  (app) => {
    const collection = new Collection({
      name: 'cirurgias_realizadas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.papel = 'admin'",
      updateRule: "@request.auth.papel = 'admin'",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'consultor', type: 'text' },
        { name: 'nome_paciente', type: 'text', required: true },
        { name: 'data_cirurgia', type: 'date' },
        { name: 'valor_venda', type: 'number' },
        { name: 'forma_pagamento', type: 'text' },
        { name: 'valor_pago', type: 'number' },
        { name: 'valor_a_receber', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('cirurgias_realizadas')
    app.delete(collection)
  },
)
