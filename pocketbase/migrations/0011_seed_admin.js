migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'acmacedo2005@gmail.com')
      return // already seeded
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('acmacedo2005@gmail.com')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Admin Skip')
    record.set('papel', 'admin')
    record.set('ativo', true)
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'acmacedo2005@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
