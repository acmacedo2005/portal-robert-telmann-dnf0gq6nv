onRecordAfterCreateSuccess((e) => {
  const rec = e.record
  const tipo = rec.getString('tipo')
  const status = rec.getString('status')
  const valor = rec.getFloat('valor')
  const nome_negociador = rec.getString('nome_negociador') || ''
  const descricao = rec.getString('descricao') || ''
  const data = rec.getString('data')
  const data_quitacao = rec.getString('data_quitacao') || data
  const data_vencimento = rec.getString('data_vencimento') || data

  let linked = false

  if (tipo === 'EXPENSE') {
    try {
      const contasPagar = new Record($app.findCollectionByNameOrId('contas_pagar'))
      contasPagar.set('descricao', descricao || 'Importado via sistema')
      contasPagar.set('fornecedor', nome_negociador || 'Não informado')
      contasPagar.set('valor', valor)
      contasPagar.set('status', status === 'QUITADO' ? 'paga' : 'pendente')
      contasPagar.set('categoria', 'despesa')
      contasPagar.set('data_vencimento', data_vencimento)
      if (status === 'QUITADO') {
        contasPagar.set('data_pagamento', data_quitacao)
        contasPagar.set('valor_pago', valor)
      }
      contasPagar.set('lancamento_id', rec.id)
      $app.save(contasPagar)
      linked = true
    } catch (err) {
      $app.logger().error('Error generating expense', 'err', String(err))
    }
  } else if (tipo === 'REVENUE' && status === 'QUITADO') {
    try {
      let vendaId = null

      const safeNome = nome_negociador.replace(/'/g, '').replace(/"/g, '')
      const safeDesc = descricao.replace(/'/g, '').replace(/"/g, '')

      let filterParts = []
      if (safeNome) filterParts.push(`paciente_id.nome ~ "${safeNome}"`)
      if (safeDesc) filterParts.push(`observacoes ~ "${safeDesc}"`)

      if (filterParts.length > 0) {
        const filter = filterParts.join(' || ')
        const vendas = $app.findRecordsByFilter('vendas', filter, 'created', 1, 0)
        if (vendas.length > 0) {
          vendaId = vendas[0].id
        }
      }

      if (vendaId) {
        const crs = $app.findRecordsByFilter(
          'contas_receber',
          `venda_id = "${vendaId}" && status != 'Pago'`,
          'created',
          1,
          0,
        )
        if (crs.length > 0) {
          const cr = crs[0]
          const valorTotal = cr.getFloat('valor_total')
          let valorRecebido = cr.getFloat('valor_recebido') + valor
          let valorPendente = valorTotal - valorRecebido
          let novoStatus = valorPendente <= 0 ? 'Pago' : 'Parcial'

          cr.set('valor_recebido', valorRecebido)
          cr.set('valor_pendente', valorPendente < 0 ? 0 : valorPendente)
          cr.set('status', novoStatus)
          $app.save(cr)

          const receb = new Record($app.findCollectionByNameOrId('recebimentos'))
          receb.set('contas_receber_id', cr.id)
          receb.set('lancamento_id', rec.id)
          receb.set('data_recebimento', data_quitacao)
          receb.set('valor_recebido', valor)
          receb.set('metodo_pagamento', rec.getString('metodo_pagamento') || 'outros')
          $app.save(receb)

          linked = true
        }
      }
    } catch (err) {
      $app.logger().error('Error matching revenue', 'err', String(err))
    }
  }

  if (!linked) {
    rec.set('descricao', descricao + (descricao ? ' ' : '') + '[UNLINKED]')
    $app.saveNoValidate(rec)
  }

  e.next()
}, 'lancamentos_financeiros')
