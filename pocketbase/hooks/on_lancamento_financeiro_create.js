onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const tipo = record.getString('tipo')
  const status = record.getString('status')

  if (tipo === 'REVENUE' && status === 'QUITADO') {
    try {
      let pacienteId = null
      const nomeNegociador = record.getString('nome_negociador').trim()

      if (nomeNegociador) {
        try {
          const records = $app.findRecordsByFilter('pacientes', 'nome = {:nome}', '', 1, 0, {
            nome: nomeNegociador,
          })
          if (records && records.length > 0) {
            pacienteId = records[0].id
          }
        } catch (_) {}
      }

      let contasReceber = null
      if (pacienteId) {
        try {
          const pendingRecords = $app.findRecordsByFilter(
            'contas_receber',
            "paciente_id = {:pid} && status != 'Pago'",
            'created',
            1,
            0,
            { pid: pacienteId },
          )
          if (pendingRecords && pendingRecords.length > 0) {
            contasReceber = pendingRecords[0]
          }
        } catch (_) {}
      }

      if (contasReceber) {
        const valorLancamento = record.getFloat('valor')
        const valorRecebido = contasReceber.getFloat('valor_recebido') + valorLancamento
        const valorTotal = contasReceber.getFloat('valor_total')
        let valorPendente = valorTotal - valorRecebido
        if (valorPendente < 0) valorPendente = 0

        contasReceber.set('valor_recebido', valorRecebido)
        contasReceber.set('valor_pendente', valorPendente)
        contasReceber.set('status', valorPendente <= 0 ? 'Pago' : 'Parcial')
        $app.save(contasReceber)

        const recCol = $app.findCollectionByNameOrId('recebimentos')
        const rec = new Record(recCol)
        rec.set('contas_receber_id', contasReceber.id)
        rec.set('lancamento_id', record.id)
        rec.set('data_recebimento', record.getString('data_quitacao') || record.getString('data'))
        rec.set('valor_recebido', valorLancamento)
        rec.set('metodo_pagamento', record.getString('metodo_pagamento'))
        rec.set('observacoes', record.getString('descricao'))
        $app.save(rec)
      } else {
        $app
          .logger()
          .info('REVENUE imported but not linked to any contas_receber', 'lancamento_id', record.id)
      }
    } catch (err) {
      $app.logger().error('Error reconciling REVENUE', 'err', String(err))
    }
  } else if (tipo === 'EXPENSE') {
    try {
      const cpCol = $app.findCollectionByNameOrId('contas_pagar')
      const cp = new Record(cpCol)
      cp.set('descricao', record.getString('descricao'))
      cp.set('fornecedor', record.getString('nome_negociador'))
      cp.set('valor', record.getFloat('valor'))
      cp.set('status', record.getString('data_quitacao') ? 'paga' : 'pendente')
      cp.set('categoria', 'despesa')
      cp.set('data_vencimento', record.getString('data_vencimento') || record.getString('data'))
      cp.set('data_pagamento', record.getString('data_quitacao') || '')
      cp.set('valor_pago', record.getString('data_quitacao') ? record.getFloat('valor') : 0)
      cp.set('lancamento_id', record.id)
      $app.save(cp)
    } catch (err) {
      $app.logger().error('Error creating EXPENSE', 'err', String(err))
    }
  }
  e.next()
}, 'lancamentos_financeiros')
