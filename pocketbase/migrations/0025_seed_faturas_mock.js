migrate(
  (app) => {
    let paciente
    try {
      paciente = app.findFirstRecordByFilter('pacientes', '1=1')
    } catch (_) {
      const col = app.findCollectionByNameOrId('pacientes')
      paciente = new Record(col)
      paciente.set('nome', 'Mock Paciente Silva')
      app.save(paciente)
    }

    const faturasCol = app.findCollectionByNameOrId('faturas')
    const now = new Date()

    const mockFaturas = [
      {
        status: 'pendente',
        valor: 1500,
        tipo_parcela: 'entrada',
        daysOffset: 5,
        obs: 'Entrada da cirurgia capilar',
      },
      { status: 'pendente', valor: 800, tipo_parcela: 'parcelada', daysOffset: 15, obs: '' },
      {
        status: 'pendente',
        valor: 1200,
        tipo_parcela: 'saldo',
        daysOffset: 30,
        obs: 'Saldo restante do tratamento',
      },
      {
        status: 'vencida',
        valor: 900,
        tipo_parcela: 'parcelada',
        daysOffset: -5,
        obs: 'Atraso de 5 dias - contatar',
      },
      {
        status: 'vencida',
        valor: 1100,
        tipo_parcela: 'parcelada',
        daysOffset: -15,
        obs: 'Ligar para cobrar urgência',
      },
      { status: 'vencida', valor: 2000, tipo_parcela: 'saldo', daysOffset: -2, obs: '' },
      {
        status: 'paga',
        valor: 1500,
        tipo_parcela: 'entrada',
        daysOffset: -20,
        obs: 'Pago via PIX',
      },
      { status: 'paga', valor: 800, tipo_parcela: 'parcelada', daysOffset: -10, obs: '' },
      { status: 'paga', valor: 800, tipo_parcela: 'parcelada', daysOffset: -40, obs: '' },
      {
        status: 'paga',
        valor: 1000,
        tipo_parcela: 'saldo',
        daysOffset: -60,
        obs: 'Finalizado com sucesso',
      },
    ]

    for (const data of mockFaturas) {
      const d = new Date(now)
      d.setDate(d.getDate() + data.daysOffset)
      const vencimentoStr = d.toISOString()

      try {
        app.findFirstRecordByFilter(
          'faturas',
          `valor = ${data.valor} && status = '${data.status}' && paciente_id = '${paciente.id}' && created >= @now('-1h')`,
        )
      } catch (_) {
        const f = new Record(faturasCol)
        f.set('paciente_id', paciente.id)
        f.set('valor', data.valor)
        f.set('data_vencimento', vencimentoStr)
        f.set('status', data.status)
        f.set('tipo_parcela', data.tipo_parcela)
        f.set('observacoes', data.obs)
        if (data.status === 'paga') {
          const dp = new Date(d)
          dp.setDate(dp.getDate() - 1)
          f.set('data_pagamento', dp.toISOString())
        }
        app.save(f)
      }
    }
  },
  (app) => {
    // Mock data can be left alone or manually deleted if needed
  },
)
