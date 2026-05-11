migrate(
  (app) => {
    let paciente
    try {
      paciente = app.findFirstRecordByData('pacientes', 'cpf', '123.456.789-00')
    } catch (_) {
      const col = app.findCollectionByNameOrId('pacientes')
      paciente = new Record(col)
      paciente.set('nome', 'Maria Oliveira')
      paciente.set('cpf', '123.456.789-00')
      paciente.set('telefone', '11999999999')
      app.save(paciente)
    }

    const vendasCol = app.findCollectionByNameOrId('vendas')

    // Idempotency check: skip if we already have test sales for this patient
    try {
      const existing = app.findFirstRecordByData('vendas', 'paciente_id', paciente.id)
      if (existing) return
    } catch (_) {}

    const d1 = new Date()
    d1.setDate(d1.getDate() - 2)

    const d2 = new Date()
    d2.setDate(d2.getDate() + 10)

    const seed = [
      {
        tipo: 'cirurgia',
        valor_total: 12000,
        desconto_cortesia: 0,
        valor_final: 12000,
        entrada_paga: 4000,
        saldo_restante: 8000,
        status: 'parcial',
        parcelas: 4,
        data_venda: d1.toISOString(),
        data_cirurgia: d2.toISOString(),
        observacoes: 'FUE 3000 folículos',
      },
      {
        tipo: 'tratamento',
        valor_total: 2000,
        desconto_cortesia: 200,
        valor_final: 1800,
        entrada_paga: 1800,
        saldo_restante: 0,
        status: 'paga',
        sessoes_meso: 3,
        parcelas: 1,
        data_venda: new Date().toISOString(),
      },
      {
        tipo: 'cirurgia_tratamento',
        valor_total: 15000,
        desconto_cortesia: 1000,
        valor_final: 14000,
        entrada_paga: 0,
        saldo_restante: 14000,
        status: 'pendente',
        sessoes_prp: 5,
        parcelas: 10,
        data_venda: new Date().toISOString(),
      },
      {
        tipo: 'cirurgia',
        valor_total: 10000,
        desconto_cortesia: 0,
        valor_final: 10000,
        entrada_paga: 10000,
        saldo_restante: 0,
        status: 'paga',
        parcelas: 1,
        data_venda: new Date().toISOString(),
      },
      {
        tipo: 'tratamento',
        valor_total: 1500,
        desconto_cortesia: 0,
        valor_final: 1500,
        entrada_paga: 500,
        saldo_restante: 1000,
        status: 'parcial',
        sessoes_botox: 1,
        parcelas: 2,
        data_venda: new Date().toISOString(),
      },
    ]

    for (const item of seed) {
      const v = new Record(vendasCol)
      v.set('paciente_id', paciente.id)
      Object.keys(item).forEach((k) => v.set(k, item[k]))
      app.save(v)
    }
  },
  (app) => {
    // Safe to leave empty, manual cleanup if needed
  },
)
