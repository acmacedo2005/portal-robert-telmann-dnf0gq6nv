migrate(
  (app) => {
    const collection = new Collection({
      name: 'tratamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        {
          name: 'paciente_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('pacientes').id,
          maxSelect: 1,
        },
        {
          name: 'tipo_tratamento',
          type: 'select',
          required: true,
          values: ['meso', 'prp', 'botox'],
          maxSelect: 1,
        },
        { name: 'data_inicio', type: 'date' },
        { name: 'data_fim', type: 'date' },
        { name: 'valor_total', type: 'number' },
        { name: 'sessoes_total', type: 'number' },
        { name: 'sessoes_realizadas', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'concluido', 'cancelado'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('tratamentos')
    app.delete(collection)
  },
)
