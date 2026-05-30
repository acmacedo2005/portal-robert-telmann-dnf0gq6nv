onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const tipo = record.getString('tipo')
  const status = record.getString('status')

  if (tipo === 'EXPENSE') {
    try {
      const cpCol = $app.findCollectionByNameOrId('contas_pagar')
      const cp = new Record(cpCol)
      cp.set('lancamento_id', record.id)
      const fornec =
        record.getString('paciente_fornecedor') ||
        record.getString('nome_negociador') ||
        'Desconhecido'
      cp.set('fornecedor', fornec)
      cp.set('valor', record.getFloat('valor'))

      const dataVencimento = record.getString('data_vencimento') || record.getString('data')
      cp.set('data_vencimento', dataVencimento)

      if (status === 'QUITADO' || record.getString('data_quitacao')) {
        cp.set('status', 'paga')
        cp.set('data_pagamento', record.getString('data_quitacao') || record.getString('data'))
        cp.set('valor_pago', record.getFloat('valor'))
      } else {
        cp.set('status', 'pendente')
      }

      cp.set('descricao', record.getString('descricao') || 'Lançamento ' + record.id)

      $app.save(cp)
    } catch (err) {
      $app.logger().error('Error creating contas_pagar', 'err', err.message)
    }
  } else if (tipo === 'REVENUE') {
    const vendaId = record.getString('venda_id')
    if (vendaId) {
      try {
        const lancamentos = $app.findRecordsByFilter(
          'lancamentos_financeiros',
          'venda_id={:vid}&&tipo={:t}&&status={:s}',
          '',
          1000,
          0,
          { vid: vendaId, t: 'REVENUE', s: 'QUITADO' },
        )

        let totalRecebido = 0
        for (let i = 0; i < lancamentos.length; i++) {
          totalRecebido += lancamentos[i].getFloat('valor')
        }

        $app.runInTransaction((txApp) => {
          const venda = txApp.findRecordById('vendas', vendaId)
          venda.set('valor_recebido', totalRecebido)

          const valorTotal = venda.getFloat('valor_final') || venda.getFloat('valor_total')

          if (totalRecebido >= valorTotal && valorTotal > 0) {
            venda.set('status', 'Quitada')
          } else if (totalRecebido > 0) {
            venda.set('status', 'Parcialmente Quitada')
          } else {
            venda.set('status', 'Pendente')
          }

          venda.set('saldo_restante', Math.max(0, valorTotal - totalRecebido))
          txApp.saveNoValidate(venda)
        })
      } catch (err) {
        $app.logger().error('Error syncing venda on create', 'err', err.message)
      }
    }
  }

  e.next()
}, 'lancamentos_financeiros')
