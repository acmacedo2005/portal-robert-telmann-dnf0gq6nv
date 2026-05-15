migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    const vends = [
      { nome: 'Carlos Sales', email: 'carlos@clinicacapilar.com', papel: 'vendedor' },
      { nome: 'Micael Vendas', email: 'micael@clinicacapilar.com', papel: 'vendedor' },
      { nome: 'Bruna Comercial', email: 'bruna@clinicacapilar.com', papel: 'vendedor' },
    ]

    let firstVendedorId = null

    vends.forEach((v) => {
      try {
        const existing = app.findAuthRecordByEmail('_pb_users_auth_', v.email)
        if (!firstVendedorId) firstVendedorId = existing.id
      } catch (_) {
        const record = new Record(usersCol)
        record.setEmail(v.email)
        record.setPassword('Skip@Pass')
        record.setVerified(true)
        record.set('name', v.nome)
        record.set('nome', v.nome)
        record.set('papel', v.papel)
        record.set('ativo', true)
        app.save(record)
        if (!firstVendedorId) firstVendedorId = record.id
      }
    })

    try {
      const paciente = app.findFirstRecordByFilter('pacientes', '1=1')

      try {
        app.findFirstRecordByFilter(
          'vendas',
          `paciente_id='${paciente.id}' && vendedor_id='${firstVendedorId}'`,
        )
      } catch (_) {
        const vendasCol = app.findCollectionByNameOrId('vendas')
        const v = new Record(vendasCol)
        v.set('paciente_id', paciente.id)
        v.set('vendedor_id', firstVendedorId)
        v.set('tipo', 'tratamento')
        v.set('valor_total', 5000)
        v.set('valor_final', 5000)
        v.set('entrada_paga', 1000)
        v.set('saldo_restante', 4000)
        v.set('status', 'parcial')
        const now = new Date().toISOString()
        v.set('data_venda', now)
        v.set('parcelas', 4)
        app.save(v)

        const parcelasCol = app.findCollectionByNameOrId('parcelas_venda')

        const p1 = new Record(parcelasCol)
        p1.set('venda_id', v.id)
        p1.set('numero_parcela', 1)
        p1.set('valor_parcela', 1000)
        p1.set('data_vencimento', now)
        p1.set('forma_pagamento', 'pix')
        p1.set('status', 'paga')
        p1.set('data_pagamento', now)
        app.save(p1)

        for (let i = 0; i < 4; i++) {
          const p = new Record(parcelasCol)
          p.set('venda_id', v.id)
          p.set('numero_parcela', i + 2)
          p.set('valor_parcela', 1000)

          let d = new Date()
          d.setDate(d.getDate() + 30 * (i + 1))

          p.set('data_vencimento', d.toISOString())
          p.set('forma_pagamento', 'cartao_credito')
          p.set('status', 'pendente')
          app.save(p)
        }

        const comissaoCol = app.findCollectionByNameOrId('comissoes_vendedor')
        const c = new Record(comissaoCol)
        c.set('vendedor_id', firstVendedorId)
        c.set('venda_id', v.id)
        c.set('percentual_comissao', 10)
        c.set('valor_comissao', 500)
        c.set('status', 'pendente')
        c.set('data_calculo', now)
        app.save(c)
      }
    } catch (_) {}
  },
  (app) => {},
)
