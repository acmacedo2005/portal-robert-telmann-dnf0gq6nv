onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const tipo = record.getString('tipo')

  if (tipo === 'REVENUE') {
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
        $app.logger().error('Error syncing venda on update', 'err', err.message)
      }
    }
  }

  e.next()
}, 'lancamentos_financeiros')
