migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let schemaChanged = false

    if (!users.fields.getByName('papel')) {
      users.fields.add(
        new SelectField({
          name: 'papel',
          values: ['admin', 'vendedor', 'financeiro', 'medico', 'enfermagem'],
          maxSelect: 1,
        }),
      )
      schemaChanged = true
    }

    if (!users.fields.getByName('ativo')) {
      users.fields.add(
        new BoolField({
          name: 'ativo',
        }),
      )
      schemaChanged = true
    }

    if (schemaChanged) {
      app.save(users)
    }

    // Refetch to ensure the record uses the updated schema
    const updatedUsers = app.findCollectionByNameOrId('_pb_users_auth_')

    const seedUser = (email, password, name, role) => {
      try {
        app.findAuthRecordByEmail('_pb_users_auth_', email)
        return // already exists
      } catch (_) {}

      const record = new Record(updatedUsers)
      record.setEmail(email)
      record.setPassword(password)
      record.setVerified(true)
      record.set('name', name)
      record.set('papel', role)
      record.set('ativo', true)

      app.save(record)
    }

    seedUser('acmacedo2005@gmail.com', 'Skip@Pass', 'Administrador', 'admin')
    seedUser('medico@clinica.com', 'Skip@Pass', 'Médico', 'medico')
  },
  (app) => {
    const deleteUser = (email) => {
      try {
        const record = app.findAuthRecordByEmail('_pb_users_auth_', email)
        app.delete(record)
      } catch (_) {}
    }

    deleteUser('acmacedo2005@gmail.com')
    deleteUser('medico@clinica.com')
  },
)
