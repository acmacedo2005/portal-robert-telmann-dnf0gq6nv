migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Seed admin user
    let adminId = ''
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'acmacedo2005@gmail.com')
      adminId = admin.id
    } catch (_) {
      const record = new Record(users)
      record.setEmail('acmacedo2005@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Admin')
      record.set('papel', 'admin')
      record.set('ativo', true)
      app.save(record)
      adminId = record.id
    }

    // Seed medico user
    let medicoId = ''
    try {
      const medico = app.findAuthRecordByEmail('_pb_users_auth_', 'medico@clinica.com')
      medicoId = medico.id
    } catch (_) {
      const record = new Record(users)
      record.setEmail('medico@clinica.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Dr. Roberto')
      record.set('papel', 'medico')
      record.set('ativo', true)
      app.save(record)
      medicoId = record.id
    }

    const pacientes = app.findCollectionByNameOrId('pacientes')
    let paciente1Id = ''
    try {
      const p1 = app.findFirstRecordByData('pacientes', 'cpf', '111.111.111-11')
      paciente1Id = p1.id
    } catch (_) {
      const record = new Record(pacientes)
      record.set('nome', 'João Silva')
      record.set('telefone', '(11) 99999-9999')
      record.set('email', 'joao@email.com')
      record.set('data_nascimento', '1985-05-15 12:00:00.000Z')
      record.set('cpf', '111.111.111-11')
      record.set('cidade', 'São Paulo')
      record.set('estado', 'SP')
      app.save(record)
      paciente1Id = record.id
    }

    let paciente2Id = ''
    try {
      const p2 = app.findFirstRecordByData('pacientes', 'cpf', '222.222.222-22')
      paciente2Id = p2.id
    } catch (_) {
      const record = new Record(pacientes)
      record.set('nome', 'Maria Oliveira')
      record.set('telefone', '(21) 98888-8888')
      record.set('email', 'maria@email.com')
      record.set('data_nascimento', '1990-10-20 12:00:00.000Z')
      record.set('cpf', '222.222.222-22')
      record.set('cidade', 'Rio de Janeiro')
      record.set('estado', 'RJ')
      app.save(record)
      paciente2Id = record.id
    }
  },
  (app) => {
    // Revert logic not strictly necessary for simple seeds
  },
)
