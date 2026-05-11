migrate(
  (app) => {
    const agendamentosCol = app.findCollectionByNameOrId('agendamentos')

    // Try to find patients and professionals
    const pacientes = app.findRecordsByFilter('pacientes', '1=1', '', 10, 0)
    const profissionais = app.findRecordsByFilter('users', "papel != 'admin'", '', 10, 0)

    if (pacientes.length === 0 || profissionais.length === 0) {
      return // nothing to seed if we lack references
    }

    const tipos = ['cirurgia', 'tratamento', 'avaliacao', 'retorno']
    const statuses = ['agendado', 'realizada', 'agendado', 'agendado'] // mostly agendado

    for (let i = 0; i < 10; i++) {
      const paciente = pacientes[i % pacientes.length]
      const profissional = profissionais[i % profissionais.length]

      // Spread dates around the current date
      const date = new Date()
      date.setDate(date.getDate() + (i * 2 - 5)) // from -5 to +13 days

      const record = new Record(agendamentosCol)
      record.set('paciente_id', paciente.id)
      record.set('tipo', tipos[i % tipos.length])
      record.set('data_agendamento', date.toISOString().split('T')[0] + ' 12:00:00.000Z')
      record.set('hora_agendamento', `${9 + (i % 8)}:00`)
      record.set('profissional_id', profissional.id)
      record.set('status', statuses[i % statuses.length])
      record.set('observacoes', 'Mock seed data ' + i)

      app.save(record)
    }
  },
  (app) => {
    const agendamentos = app.findRecordsByFilter(
      'agendamentos',
      "observacoes ~ 'Mock seed data'",
      '',
      100,
      0,
    )
    for (const a of agendamentos) {
      app.delete(a)
    }
  },
)
