migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('papel')) {
      users.fields.add(
        new SelectField({
          name: 'papel',
          values: ['admin', 'vendedor', 'financeiro', 'medico', 'enfermagem'],
          required: true,
        }),
      )
    }

    if (!users.fields.getByName('ativo')) {
      users.fields.add(
        new BoolField({
          name: 'ativo',
        }),
      )
    }

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.removeByName('papel')
    users.fields.removeByName('ativo')
    app.save(users)
  },
)
