migrate(
  (app) => {
    const collection = new Collection({
      name: 'retornos_automaticos',
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
          collectionId: app.findCollectionByNameOrId('cirurgias').id,
          maxSelect: 1,
        },
        {
          name: 'dias_apos',
          type: 'select',
          required: true,
          values: ['10', '30', '90', '180', '365'],
          maxSelect: 1,
        },
        { name: 'tipo_retorno', type: 'select', values: ['online', 'presencial'], maxSelect: 1 },
        {
          name: 'profissional_tipo',
          type: 'select',
          values: ['enfermagem', 'medico'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['agendado', 'realizado', 'cancelado'],
          maxSelect: 1,
        },
        { name: 'data_agendamento_gerada', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('retornos_automaticos')
    app.delete(collection)
  },
)
