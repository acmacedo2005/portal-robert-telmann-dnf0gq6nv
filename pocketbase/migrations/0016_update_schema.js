migrate(
  (app) => {
    try {
      const agendamentos = app.findCollectionByNameOrId('agendamentos')
      const tipoField = agendamentos.fields.getByName('tipo')
      if (tipoField) {
        tipoField.values = ['cirurgia', 'aplicacao', 'avaliacao', 'retorno', 'meso', 'prp', 'botox']
        app.save(agendamentos)
      }
    } catch (e) {
      // silently skip if collection does not exist
    }

    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!users.fields.getByName('nome')) {
        users.fields.add(new TextField({ name: 'nome' }))
        app.save(users)
      }
    } catch (e) {
      // silently skip if auth collection fails lookup
    }
  },
  (app) => {
    // down migration
  },
)
