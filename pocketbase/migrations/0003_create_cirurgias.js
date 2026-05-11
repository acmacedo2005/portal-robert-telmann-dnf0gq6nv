migrate(
  (app) => {
    const pacientes = app.findCollectionByNameOrId('pacientes')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const cirurgias = new Collection({
      name: 'cirurgias',
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
          collectionId: pacientes.id,
          maxSelect: 1,
        },
        { name: 'data_cirurgia', type: 'date', required: true },
        {
          name: 'medico_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'valor_total', type: 'number', required: true },
        { name: 'entrada_paga', type: 'number' },
        { name: 'saldo_restante', type: 'number' },
        { name: 'status', type: 'select', values: ['agendada', 'realizada', 'cancelada'] },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(cirurgias)
  },
  (app) => {
    const cirurgias = app.findCollectionByNameOrId('cirurgias')
    app.delete(cirurgias)
  },
)
