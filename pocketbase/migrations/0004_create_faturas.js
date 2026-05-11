migrate(
  (app) => {
    const cirurgias = app.findCollectionByNameOrId('cirurgias')
    const pacientes = app.findCollectionByNameOrId('pacientes')

    const faturas = new Collection({
      name: 'faturas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        {
          name: 'cirurgia_id',
          type: 'relation',
          required: true,
          collectionId: cirurgias.id,
          maxSelect: 1,
        },
        {
          name: 'paciente_id',
          type: 'relation',
          required: true,
          collectionId: pacientes.id,
          maxSelect: 1,
        },
        { name: 'valor', type: 'number', required: true },
        { name: 'data_vencimento', type: 'date', required: true },
        { name: 'data_pagamento', type: 'date' },
        { name: 'status', type: 'select', values: ['pendente', 'vencida', 'paga'] },
        { name: 'tipo_parcela', type: 'select', values: ['entrada', 'saldo', 'parcelada'] },
        { name: 'numero_parcela', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(faturas)
  },
  (app) => {
    const faturas = app.findCollectionByNameOrId('faturas')
    app.delete(faturas)
  },
)
