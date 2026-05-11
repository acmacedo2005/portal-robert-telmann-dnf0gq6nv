migrate(
  (app) => {
    const pacientesId = app.findCollectionByNameOrId('pacientes').id
    const usersId = '_pb_users_auth_'
    const cirurgiasId = app.findCollectionByNameOrId('cirurgias').id
    const tratamentosId = app.findCollectionByNameOrId('tratamentos').id
    const retornosId = app.findCollectionByNameOrId('retornos_automaticos').id

    const collection = new Collection({
      name: 'agendamentos',
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
          collectionId: pacientesId,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['cirurgia', 'tratamento', 'avaliacao', 'retorno'],
          maxSelect: 1,
        },
        { name: 'data_agendamento', type: 'date', required: true },
        { name: 'hora_agendamento', type: 'text' },
        {
          name: 'profissional_id',
          type: 'relation',
          required: true,
          collectionId: usersId,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['agendado', 'realizada', 'cancelado', 'rascunho'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'cirurgia_id', type: 'relation', collectionId: cirurgiasId, maxSelect: 1 },
        { name: 'tratamento_id', type: 'relation', collectionId: tratamentosId, maxSelect: 1 },
        { name: 'retorno_automatico_id', type: 'relation', collectionId: retornosId, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('agendamentos')
    app.delete(collection)
  },
)
